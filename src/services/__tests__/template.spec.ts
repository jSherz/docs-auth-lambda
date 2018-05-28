import { renderTemplate } from "../templates";

describe("services/template", () => {
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
