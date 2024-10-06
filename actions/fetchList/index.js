/*
* <license header>
*/

/**
 * This is a sample action showcasing how to create a cloud event and publish to I/O Events
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */


/**
 * {
 *   "payload": {
 *     "assetDetails": {
 *       "urn:aaid:aem:347a2526-b5e7-4d4c-b2c1-be1459aaa9f1": {
 *         "assetID": "urn:aaid:aem:347a2526-b5e7-4d4c-b2c1-be1459aaa9f1",
 *         "assetPath": "https://delivery-p66302-e574366.adobeaemcloud.com/adobe/assets/urn:aaid:aem:347a2526-b5e7-4d4c-b2c1-be1459aaa9f1/as/vapor-untouchable-2-mens-football-cleat(15).jpg?width=2048&height=2048&preferwebp=true",
 *         "expirationDate": null,
 *         "isExpired": false,
 *         "toBeExpired": false,
 *         "mimeType": "image",
 *         "pagePath": ["/assets-report-poc/speedracer-pro-x"],
 *         "tags": ["football-shoes", "football"],
 *         "tagsMisMatchedPages": [], // details of pages which has mis matched tags
 *         "metadata": {
 *           // complete metadata as returned from metadataAPI
 *         },
 *       },
 *       {
 *
 *       },.....// more assets
 *     },// end of Asset Details Map
 *     "pageDetails": {
 *       "/assets-report-poc/proflex-elite-x1": {
 *         "assets": {
 *           "urn:aaid:aem:53d6a58c-1824-4bb5-ae1d-1fe16f56dcfb": {
 *             "assetID": "urn:aaid:aem:53d6a58c-1824-4bb5-ae1d-1fe16f56dcfb",
 *             "expirationDate": null,
 *             "mimeType": "image",
 *             "tags": ["basketball-shoes", "basketball"]
 *           },
 *           "urn:aaid:aem:eb10ba84-bfe4-4b9e-ba19-4afdcb88f1f3": {
 *             "assetID": "urn:aaid:aem:eb10ba84-bfe4-4b9e-ba19-4afdcb88f1f3",
 *             "expirationDate": null,
 *             "mimeType": "image",
 *             "tags": ["basketball-shoes", "basketball"]
 *           },
 *           "urn:aaid:aem:ee7a00ff-46ff-432c-94db-a2420cab3fd1": {
 *             "assetID": "urn:aaid:aem:ee7a00ff-46ff-432c-94db-a2420cab3fd1",
 *             "expirationDate": null,
 *             "mimeType": "image",
 *             "tags": ["basketball-shoes", "basketball"]
 *           },
 *           "urn:aaid:aem:f2090d5a-5a18-48cd-beea-690fdb19129b": {
 *             "assetID": "urn:aaid:aem:f2090d5a-5a18-48cd-beea-690fdb19129b",
 *             "expirationDate": null,
 *             "mimeType": "image",
 *             "tags": ["basketball-shoes", "basketball"]
 *           }
 *         },
 *         "misMatchedAssets": [], // list of all assets on the page with mismatched pages
 *         "tags": ["basketball"]
 *       },
 *       {
 *
 *       },...
 *       }// end of Page Details Map
 *    }
 *
 */

const { Core, Events } = require('@adobe/aio-sdk')
const uuid = require('uuid')
const {
  CloudEvent
} = require("cloudevents");
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const AUTH_HEADER = 'Bearer ' + getBearerToken(params);// process.env.AUTH_HEADER;
  console.log(AUTH_HEADER);
  const API_KEY = 'franklin';


  try {

    console.log("fetching query index");
    const hlxQueryUrl = params.hlxUrl.endsWith('/') ? `${params.hlxUrl}query-index.json` : `${params.hlxUrl}/query-index.json`;
    const queryResponse = await fetch(hlxQueryUrl);
    const queryData = await queryResponse.json();
    console.log(queryData);

    const pageDetails = {};

    for (const page of queryData.data) {
      pageDetails[page.path] = {
        tags: JSON.parse(page.tags),
        assets: {},
        misMatchedAssets:[],
      };
    }

    console.log("fetching asset index");
    const hlxUrl = params.hlxUrl.endsWith('/') ? `${params.hlxUrl}assets-index.json` : `${params.hlxUrl}/assets-index.json`;
    console.log(hlxUrl);
    const indexResponse = await fetch(hlxUrl);
    const jsonData = await indexResponse.json();

    console.log(jsonData);

    const dataMap = {};

    const fetchMetadata = async (assetID, authUrl) => {
      const metadataUrl = `${authUrl}/adobe/assets/${assetID}/metadata`;
      console.log("metdataurl is " + metadataUrl);
      const response = await fetch(metadataUrl, {
        headers: {
          'authorization': AUTH_HEADER,
          'x-api-key': API_KEY
        }
      });
      return response.json();
    };

    const convertToIST = (dateString) => {
      const date = new Date(dateString);
      const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };
      return new Intl.DateTimeFormat('en-IN', options).format(date);
    };

    const currentDate = new Date();
    for (const item of jsonData.data) {
      if (!item.path.includes("assets-report-poc")) {
        continue;
      }
      const polarisAssets = JSON.parse(item["polaris-assets"]);

      if (polarisAssets.length > 0) {
        for (const asset of polarisAssets) {
          // Extract asset ID and authentication URL using regex
          const assetIDMatch = asset.match(/adobe\/assets\/(urn:aaid:aem:[^\/]+)/);
          if (assetIDMatch) {
            const assetID = assetIDMatch[1];
            const urlMatch = asset.match(/^(https?:\/\/[^\/]+)/);
            if (urlMatch) {
              const authUrl = urlMatch[1];

              // If assetID is already in the map, update the pagePath array
              let tagsMisMatched = false;
              if (dataMap[assetID]) {
                dataMap[assetID].pagePath.push(item.path);
              } else {
                // Fetch metadata if assetID is not in the map
                console.log("fetching for assetID " + assetID);
                const metadata = await fetchMetadata(assetID, authUrl);
                console.log(metadata);
                const tags = metadata?.assetMetadata?.["xcm:keywords"]
                    ? metadata.assetMetadata["xcm:keywords"].map(keyword => keyword.id)
                    : [];

                if (tags.includes("football-shoes")) {
                  tags.push("football");
                }
                if (tags.includes("basketball-shoes")) {
                  tags.push("basketball");
                }

                const expirationDate = metadata?.assetMetadata?.["pur:expirationDate"] ? metadata.assetMetadata["pur:expirationDate"] : null;

                // Determine the type based on dc:format
                // const type =  metadata?.repositoryMetadata?["dc:format"] ?.startsWith("image") ? "image" : "others";
                const type = metadata?.repositoryMetadata?.["dc:format"]?.startsWith("image") ? "image" : "others";

                const formattedExpirationDate = expirationDate ? convertToIST(expirationDate) : null;

                let isExpired = false;
                let toBeExpired = false;

                if (formattedExpirationDate) {
                  const expirationDateObj = new Date(expirationDate);
                  const timeDifference = expirationDateObj.getTime() - currentDate.getTime();
                  const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

                  if (daysDifference <= 0) {
                    isExpired = true;
                  } else {
                    toBeExpired = true;
                  }
                }


                dataMap[assetID] = {
                  assetPath: asset,
                  assetID: assetID,
                  pagePath: [item.path],
                  metadata: metadata,
                  tags: tags,
                  mimeType: type,
                  expirationDate: formattedExpirationDate,
                  tagsMisMatchedPages: [],
                  isExpired: isExpired,
                  toBeExpired:toBeExpired,
                };
              }

              if ( pageDetails[item.path] && !pageDetails[item.path].assets[assetID]) {

                const assetTags = dataMap[assetID].tags;
                const pageTags = pageDetails[item.path].tags.map(tag => tag.toLowerCase());
                const commonTags = assetTags.filter(tag => pageTags.includes(tag.toLowerCase()));
                if (commonTags.length === 0) {
                  dataMap[assetID].tagsMisMatchedPages.push(item.path);
                  pageDetails[item.path].misMatchedAssets.push(assetID);
                }

                pageDetails[item.path].assets[assetID] = {
                  assetID: assetID,
                  tags:dataMap[assetID].tags,
                  expirationDate: dataMap[assetID].expirationDate,
                  mimeType: dataMap[assetID].mimeType,
                }
              }
            }
          }
        }
      }
    }

    const response = {
      statusCode: 200,
      body: {
        payload: {
          assetDetails: dataMap,
          pageDetails: pageDetails,
        }
      }

    };
    // log the response status code
    logger.info(`${response.statusCode}: successful request`);
    return response;
  } catch (error) {
    // log any server errors
    console.log("I am here");
    logger.error(error)
    // return with 500
    return errorResponse(500, 'Server error', logger, AUTH_HEADER);
  }
}

exports.main = main
