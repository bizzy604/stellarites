/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
      extend: {
          colors: {
              primary: "#3b82f6", // Light blue as requested for accents
              "primary-dark": "#2563eb",
              "background-light": "#ffffff",
              "background-dark": "#0f172a",
              "text-light": "#111827",
              "text-dark": "#f3f4f6",
              "surface-light": "#f9fafb",
              "surface-dark": "#1e293b",
          },
          fontFamily: {
              sans: ['Inter', 'sans-serif'],
              display: ['Inter', 'sans-serif'],
          },
          borderRadius: {
              DEFAULT: "0.5rem",
          },
      },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
