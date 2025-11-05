import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		baseUrl: "http://localhost:5000",
		supportFile: "cypress/support/e2e.js",
		retries: 1,
		record: false,
	},
});

