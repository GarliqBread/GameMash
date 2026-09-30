export default {
  stories: "src/**/*.stories.tsx",
  addons: {
    theme: { enabled: true, defaultState: "light" },
    width: {
      enabled: true,
      options: { phone: 390, host: 1440, stage: 1920 },
      defaultState: 0,
    },
  },
};
