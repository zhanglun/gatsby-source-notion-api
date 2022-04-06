const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md")
const YAML = require("yaml")
const { getPages } = require("./src/notion-api/get-pages")
const { getNotionPageProperties } = require("./src/transformers/get-page-properties")
const { getNotionPageTitle } = require("./src/transformers/get-page-title")
const { getNotionPageCover } = require("./src/transformers/get-page-cover")

const NOTION_NODE_TYPE = "Notion"

exports.sourceNodes = async (
	{ actions, createContentDigest, createNodeId, reporter },
	{ token, databaseId, propsToFrontmatter = true, lowerTitleLevel = true },
) => {
	const notion = new Client({
		auth: token,
	})
	const n2m = new NotionToMarkdown({ notionClient: notion })

	const pages = await getPages({ token, databaseId }, reporter)

	pages.forEach(async (page) => {
		const title = getNotionPageTitle(page)
		const properties = getNotionPageProperties(page)
		const cover = getNotionPageCover(page)
		const mdblocks = await n2m.pageToMarkdown(page.id)
		let markdown = n2m.toMarkdownString(mdblocks)

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
