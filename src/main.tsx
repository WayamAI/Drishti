import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<ThemeProvider>
		<AuthProvider>
			<App />
		</AuthProvider>
	</ThemeProvider>,
);
