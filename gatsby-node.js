const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md")
const YAML = require("yaml")
const { getPages } = require("./src/notion-api/get-pages")
const { getNotionPageProperties } = require("./src/transformers/get-page-properties")
const { getNotionPageTitle } = require("./src/transformers/get-page-title")
const { getNotionPageCover } = require("./src/transformers/get-page-cover")

const NOTION_NODE_TYPE = "Notion"
let n2m
let notionClient

exports.onPluginInit = ({ actions }, { token }) => {
	notionClient = new Client({
		auth: token,
	})

	n2m = new NotionToMarkdown({ notionClient })
	
	console.log("Loaded gatsby-source-notion-api")
}

exports.sourceNodes = async (
	{ actions, createContentDigest, createNodeId, reporter },
	{ token, databaseId, propsToFrontmatter = true, lowerTitleLevel = true },
) => {
	const pages = await getPages(notionClient, databaseId, reporter)
	
	for(let page of pages) {
	  const pageContent = await n2m.pageToMarkdown(page.id)
		page.markdown = n2m.toMarkdownString(pageContent) 
	}

	pages.forEach(async (page) => {
		const title = getNotionPageTitle(page)
		const properties = getNotionPageProperties(page)
		const cover = getNotionPageCover(page)

		let markdown = page.markdown;

		if (propsToFrontmatter) {
			const frontmatter = Object.keys(properties).reduce(
				(acc, key) => ({
					...acc,
					[key]: properties[key].value.remoteImage || properties[key].value,
				}),
				{ title },
			)

			markdown = "---\n".concat(YAML.stringify(frontmatter)).concat("\n---\n\n").concat(markdown)
		}

		actions.createNode({
			id: createNodeId(`${NOTION_NODE_TYPE}-${page.id}`),
			title,
			cover,
			properties,
			archived: page.archived,
			createdAt: page.created_time,
			updatedAt: page.last_edited_time,
			markdownString: markdown,
			raw: page,
			json: JSON.stringify(page),
			parent: null,
			children: [],
			internal: {
				type: NOTION_NODE_TYPE,
				mediaType: "text/markdown",
				content: markdown,
				contentDigest: createContentDigest(page),
			},
		})
	})
}
