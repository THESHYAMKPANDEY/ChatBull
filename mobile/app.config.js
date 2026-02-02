const base = require("./app.json");

module.exports = () => {
  const expo = base.expo || {};
  const android = expo.android || {};
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...expo,
    android: {
      ...android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
