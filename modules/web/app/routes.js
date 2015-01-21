define({
	"/":"main#index",
	"/event/:id":"main#event",
	"/page":"main#page",
	"/project/:slug/?_str=:value":"main#project",
	"/project/:slug":"main#project"
})

