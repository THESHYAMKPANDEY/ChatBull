const base = require("./app.json");

module.exports = () => {
  const expo = base.expo || {};
  const android = expo.android || {};

  return {
    ...expo,
    android: {
      ...android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || android.googleServicesFile || "./google-services.json",
    },
  };
};
