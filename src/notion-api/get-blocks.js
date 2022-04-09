const { errorMessage } = require("../error-message")

exports.getBlocks = async (notionClient, blockId, reporter) => {
	let hasMore = true
	let blockContent = []
	let startCursor = ""

	while (hasMore) {
		try {
			const result = await notionClient.blocks.children.list({
				block_id: blockId,
				page_size: 50,
			})

			for (let childBlock of result.results) {
				if (childBlock.has_children) {
					childBlock.children = await this.getBlocks(notionClient, childBlock.id, reporter);
				}
			}

			blockContent = blockContent.concat(result.results)
			startCursor = result.next_cursor
			hasMore = result.has_more
		} catch (e) {
			reporter.panic(errorMessage)
		}
	}

	return blockContent
}
