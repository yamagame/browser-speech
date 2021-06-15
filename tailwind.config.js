module.exports = {
  purge: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      minWidth: {
        "1/2": "50vh",
      },
      minHeight: {
        "1/2": "50vh",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
