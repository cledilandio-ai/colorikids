import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FF007F", // Bright Pink
                secondary: "#00BFFF", // Deep Sky Blue
                accent: "#FFD700", // Gold
                background: "#F0F8FF", // Alice Blue
            },
        },
    },
    plugins: [],
};
export default config;
