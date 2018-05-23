import {
  CloudFrontRequestEvent,
  CloudFrontRequestHandler,
  CloudFrontRequestResult,
  Context,
} from "aws-lambda";

import { AxiosError } from "axios";
import { parse } from "qs";
import { isAuthenticated, renderTemplate } from "./services";
import {
  authenticate,
  makeLogoutCookieHeader,
  makeSetCookieHeader,
} from "./services/auth";
import { REDIRECT_URL, ROOT_URL } from "./vars";

const isAxiosError = (err: any): err is AxiosError => err.code;

export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
  _context: Context,
): Promise<CloudFrontRequestResult> => {
  try {
    const request = event.Records[0].cf.request;

    const code = request.querystring ? parse(request.querystring).code : null;

    if (isAuthenticated(request)) {
      if (request.uri.endsWith("/logout.php3")) {
        console.log("logging out");

        return {
          headers: {
            "Location": [
              {
                key: "Location",
                value: REDIRECT_URL,
              },
            ],
            "Set-Cookie": [
              {
                key: "Set-Cookie",
                value: makeLogoutCookieHeader(),
              },
            ],
          },
          status: "302",
        };
      } else {
        console.log("auth ok");

        return request;
      }
    } else if (code) {
      try {
        console.log("checking code");
        const authResponse = await authenticate(code);

        if (authResponse.hd === "hive.hr") {
          console.info("login succeded");

          return {
            headers: {
              "Location": [
                {
                  key: "Location",
                  value: ROOT_URL,
                },
              ],
              "Set-Cookie": [
                {
                  key: "Set-Cookie",
                  value: makeSetCookieHeader(authResponse),
                },
              ],
            },
            status: "302",
          };
        } else {
          console.error("non domain user - rejecting request");

          return {
            body: await renderTemplate(
              "Authentication failed - internal access only.",
            ),
            status: "401",
          };
        }
      } catch (err) {
        console.error("failed to authenticate user");

        if (isAxiosError(err) && err.response) {
          console.error(err.response.data);
        }

        return {
          body: await renderTemplate(err.message),
          status: "500",
        };
      }
    } else if (request.uri.endsWith("/login.php3")) {
      console.log("login route - showing template");

      return {
        body: await renderTemplate(),
        status: "200",
      };
    } else {
      console.log("not authenticated & no code - redirecting to login");

      return {
        headers: {
          location: [
            {
              key: "Location",
              value: "/login.php3",
            },
          ],
        },
        status: "302",
      };
    }
  } catch (err) {
    console.error(err);

    if (isAxiosError(err) && err.response) {
      console.error(err.response.data);
    }

    return {
      body: "Server made a boo boo :(",
      status: "500",
    };
  }
};
