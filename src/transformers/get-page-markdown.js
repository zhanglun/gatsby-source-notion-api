exports.getPageMarkdown = async (n2m, page) => {
	const mdblocks = await n2m.pageToMarkdown(page.id)
	const mdString = n2m.toMarkdownString(mdblocks)

	return mdString
}
