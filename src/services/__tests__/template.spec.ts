import { renderTemplate } from "../templates";

describe("services/template", () => {
  beforeAll(() => {
    const varsModule = require("../../vars");
    varsModule.GOOGLE_CLIENT_ID = "app-appy.apps.googleusercontent.com";
    varsModule.GOOGLE_CLIENT_SECRET = "ssh-secret";
    varsModule.JWT_SECRET = "hunter2";
    varsModule.ROOT_URL = "https://mydocs.cloudfront.net";
    varsModule.REDIRECT_URL = varsModule.ROOT_URL + "/login.php3";
    varsModule.DOMAIN = "jsherz.com";
  });

  describe("renderTemplate", () => {
    it("renders a template without an error", async () => {
      await expect(renderTemplate()).resolves.toMatchSnapshot();
    });

    it("renders a template with an error", async () => {
      await expect(
        renderTemplate("bad thingz happened"),
      ).resolves.toMatchSnapshot();
    });
  });
});
