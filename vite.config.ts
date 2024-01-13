// file: vite.config.ts
import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
	start: {
		middleware: 'src/middleware.ts',
		ssr: true,
	}
});
