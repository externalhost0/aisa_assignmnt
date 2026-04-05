import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "./index.css";
import App from "./App.tsx";

const theme = createTheme({
	primaryColor: "cyan",
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<MantineProvider theme={theme} defaultColorScheme="auto">
			<Notifications position="top-right" />
			<App />
		</MantineProvider>
	</StrictMode>,
);
