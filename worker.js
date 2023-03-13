// keep track of all our blog endpoints here
const myBlog = {
  hostname: "blog.example.com",
  targetSubdirectory: "/blog",
  assetsPathnames: ["/_next/", "/js/", '/api/', '_axiom', '/ping/'] 
}

//set route *example.com/*
async function handleRequest(request) {
    const parsedUrl = new URL(request.url)
    const requestMatches = match => new RegExp(match).test(parsedUrl.pathname)

    // console.log(request.body)
    if (request.method === 'POST') {
      if (requestMatches("/api/collect")) {
        var post_body = await request.json()
        console.log(post_body)
        var req_url = post_body["payload"]["url"]
        req_url = req_url.split("/")[2];
        post_body["payload"]["url"] = '/'+req_url;
        post_body["payload"]["hostname"] = `${myBlog.hostname}`;
        
        const mod_req = {
        payload: post_body["payload"],
        // method: 'POST',
        type: "pageview",
        // headers: request.headers
        };

        console.log(mod_req)
        const response = await fetch(`https://${myBlog.hostname}/${parsedUrl.pathname}`, mod_req);
        const results = await gatherResponse(response);
        return new Response(results, request);
      }
      const response = await fetch(`https://${myBlog.hostname}/${parsedUrl.pathname}`, request);
      const results = await gatherResponse(response);
      return new Response(results, request);
    }
      
    // else method is GET

    // if its blog html, get it
    if (requestMatches(myBlog.targetSubdirectory)) {
      console.log("this is a request for a blog document", parsedUrl.pathname);

      const pruned = parsedUrl.pathname.split("/").filter(part => part);
      if (parsedUrl.pathname.startsWith(myBlog.targetSubdirectory+'/newsletter')){
        return scriptadder.transform (htmlrewriter.transform(await(fetch(`https://${myBlog.hostname}/${pruned.slice(1).join("/")}`))));
      }
      if (pruned.length==1){
        return scriptadder.transform (htmlrewriter.transform(await(fetch(`https://${myBlog.hostname}`))));
      }
      else{
        return htmlrewriter.transform(await(fetch(`https://${myBlog.hostname}/${pruned.slice(1).join("/")}`)));
      }
    }

    // if its blog assets, get them
    else if (myBlog.assetsPathnames.some(requestMatches)) {
      console.log("this is a request for other blog assets", parsedUrl.pathname)
      const assetUrl = request.url.replace(parsedUrl.hostname, myBlog.hostname);
      console.log(assetUrl)
      return fetch(assetUrl)
    }

    console.log("this is a request to my root domain", parsedUrl.host, parsedUrl.pathname);
    // if its not a request blog related stuff, do nothing
    return fetch(request)
  }
// }

class AttributeRewriter {
  constructor(attributeName) {
    this.attributeName = attributeName;
  }
  element(element) {
    const attribute = element.getAttribute(this.attributeName);
    //add check for targetSubdirectory start for nested scenarios
    if (attribute && !attribute.startsWith('https://')) 
    {
      element.setAttribute(this.attributeName, myBlog.targetSubdirectory+attribute);
    }
  }
}

class ScriptAdder {
  element(element) {
      element.prepend('<script>function o(){location.href!=a&&(location.replace("'+myBlog.targetSubdirectory+'"+location.pathname),a=location.href)}var a=location.href;setInterval(o,1);</script>',{html: true});
  }
}


const htmlrewriter = new HTMLRewriter()
  .on('a', new AttributeRewriter('href'))

const scriptadder = new HTMLRewriter()
  .on('head', new ScriptAdder())

/**
 * gatherResponse awaits and returns a response body as a string.
 * Use await gatherResponse(..) in an async function to get the response body
 * @param {Response} response
 */
async function gatherResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.stringify(await response.json());
  }
  return response.text();
}



addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})
