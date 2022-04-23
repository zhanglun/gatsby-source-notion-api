const { Client } = require("@notionhq/client")
const { NotionToMarkdown } = require("notion-to-md")
const YAML = require("yaml")
const fs = require('fs');
const path = require('path');
const { getPages } = require("./src/notion-api/get-pages")
const { notionBlockToMarkdown } = require("./src/transformers/notion-block-to-markdown")
const { getNotionPageProperties } = require("./src/transformers/get-page-properties")
const { getNotionPageTitle } = require("./src/transformers/get-page-title")

const NOTION_NODE_TYPE = "Notion"

exports.onPluginInit = () => {
    console.log("Loaded gatsby-source-notion-api")
}

exports.sourceNodes = async (
    { actions, createContentDigest, createNodeId, reporter },
    { token, databaseId, propsToFrontmatter = true, lowerTitleLevel = true },
) => {
    const notionClient = new Client({
        auth: token,
    })
    const n2m = new NotionToMarkdown({ notionClient });
    const pages = await getPages(notionClient, databaseId, reporter)

    console.log('===> Page Total：%s', pages.length);

    const limit = 5;
    const taskList = [];
    let pageResults = [];

    for (let i = 0; i < pages.length; i += limit) {
        let task = pages.slice(i, i + limit).map((page) => {
            return (async () => {
                console.time(`Read page ${ page.id }`);

                // const content = await n2m.pageToMarkdown(page.id)
                const content = notionBlockToMarkdown(page, lowerTitleLevel)

                console.timeEnd(`Read page ${ page.id }`);

                // page.markdown = n2m.toMarkdownString(content)
                page.markdown = content 

                return page
            })()
        });

        taskList.push(task)
    }

    for (let task of taskList) {
        const results = await Promise.all(task)
        pageResults.push(...results);
        console.log(pageResults.length);
    }


    console.log('===> Pages ALL DONE!')

    for (const page of pages) {
        const title = getNotionPageTitle(page)
        const properties = getNotionPageProperties(page)

        let cover = ''
        
        if (page.cover) {
            cover = page.cover[page.cover?.type]?.url
        }

        let markdown = page.markdown;

        if (propsToFrontmatter) {
            const frontmatter = Object.keys(properties).reduce(
                (acc, key) => ({
                    ...acc,
                    [key]: properties[key]?.value?.remoteImage || properties[key].value,
                }),
                { title },
            )

            frontmatter.cover = cover || ''

            markdown = "---\n".concat(YAML.stringify(frontmatter)).concat("\n---\n\n").concat(markdown)
        }

        actions.createNode({
            id: createNodeId(`${ NOTION_NODE_TYPE }-${ page.id }`),
            title,
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
    }
}
