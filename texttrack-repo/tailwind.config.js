/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#1F3A5F", dark: "#16283F" },
        rust: { DEFAULT: "#B5651D", dark: "#8F4F16" },
        cream: "#F6F3EC",
      },
    },
  },
  plugins: [],
};
