const { errorMessage } = require("../error-message")
const { getBlocks } = require("./get-blocks")

exports.getPages = async (notionClient, databaseId, reporter) => {
	let hasMore = true
	let startCursor = ""
	const pages = []

	while (hasMore) {
		try {
			const result = await notionClient.databases.query({
				database_id: databaseId,
			})
			startCursor = result.next_cursor
			hasMore = result.has_more

			for (let page of result.results) {
				page.children = await getBlocks(notionClient, page.id, reporter)

				pages.push(page)
			}
		} catch (e) {
			reporter.panic(errorMessage)
		}
	}

	return pages
}
