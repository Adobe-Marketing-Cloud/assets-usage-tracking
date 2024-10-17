# Assets Usage Tracking

This project is a sample application that demonstrates how to use the Adobe Experience Platform to track assets usage in a helix site.
The application provides a report of all the assets used in the site along with important information such as
- List of all the assets used in the site
- If any expired asset is being used
- If there are mismatch between the asset tag and tag applied on the page
- How many times the asset is used in the site
- On which pages the asset is used
- Top Used Asset

The application is built using the Adobe I/O App Builder and uses the Adobe I/O Runtime to host the application and the Adobe Experience Platform SDK to track assets.

## Accessing the Tool

The tool can be accessed via the following URL:

https://experience.adobe.com/?devMode=true#/custom-apps/?localDevUrl=https://288650-edsassettracker.adobeio-static.net/index.html?hlxUrl=https://demo-custom-as-config--franklin-assets-selector--hlxsites.hlx.live

where hlxUrl is the URL of the site for which you want to track assets.

## prerequisites
To Track Usual Assets Usage, you need to have the following indexes created in your Helix Sites project:
- `assets` index
This will provide the list of all the assets used in the site along with their url and source 
category. Such as Adobe Assets, Dynamic Media Assets, Scene7 Assets etc.
Sample Index Configuration:
```yaml
assets-index:
    target: /assets-index.json
    properties:
      polaris-assets:
        select: a
        values: |
          match(attribute(el, 'href'), 'https:\/\/[^\/]+\/adobe\/assets\/urn:aaid:aem:.*')
      dm-next-assets:
        select: a
        values: |
          match(attribute(el, 'href'), 'https:\/\/[^\/]+\/adobe\/dynamicmedia\/deliver\/urn:aaid:aem:.*')
      scene7-assets:
        select: a
        values: |
          match(attribute(el, 'href'), 'https:\/\/.*scene7.com\/is\/image\/.*')
```

- `query` index
This is in general the default index in the Helix Sites project which provides the list of all the pages in the site.
This index needs to be enabled with metadata property **tags** to provide the information tags applied on the page.
Sample Index Configuration:
```yaml
site:
    target: /query-index.json
    properties:
      tags:
        select: head > meta[property="article:tag"]
        values: |
          attribute(el, 'content')
```

Complete sample yaml configuration can be found [here](https://github.com/hlxsites/franklin-assets-selector/blob/main/helix-query.yaml)
## Local Run
- Run `aio app run` to start the application
- Open your browser to `http://localhost:9080` to see the app running locally and it will redirect to assets usage report page.
- pass `hlxUrl` query parameter to see the assets usage report for the given hlxUrl for example 
  -> https://localhost:9080/index.html?hlxUrl=https://demo-custom-as-config--franklin-assets-selector--hlxsites.hlx.live/
- To view your deployed application in the Experience Cloud shell:
  -> https://experience.adobe.com/?devMode=true#/custom-apps/?localDevUrl=https://localhost:9080


