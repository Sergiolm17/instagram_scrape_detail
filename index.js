var express = require("express");
var app = express();
var pretty = require("express-prettify");
var ig = require("instagram-scraping");
const bud = require("basic-instagram-user-details");
const instory = require("instory");
const ipp = require("instagram-profile-picture");
var findHashtags = require("find-hashtags");

app.get("/tag/:tagId", async (req, res) => {
  try {
    const result = await ig.scrapeTag(req.params.tagId);
    const medias = result.medias;
    const array = [];
    console.log(medias[0]);
    await medias.forEach(entry => {
      array.push({
        shortcode: entry.shortcode,
        owner_id: entry.owner_id,
        media_id: entry.media_id,
        name: entry.text,
        hashtags: findHashtags(entry.text),
        thumbnail: entry.thumbnail,
        like_count: entry.like_count.count,
        date: new Date(entry.date * 1000).toLocaleString("en-US", {
          timeZone: "America/Lima"
        }),
        comment_count: entry.comment_count.count
      });
    });
    res.json(array);
  } catch (error) {
    console.log(error);
  }
});

app.get("/followers/:tagId", async (req, res) => {
  try {
    const data = await bud(req.params.tagId, "followers");
    await res.json(data);
  } catch (error) {
    console.log(error);
  }
});
app.get("/history/:tagId", async (req, res) => {
  try {
    const data = await instory(req.params.tagId);
    await res.json(data.story);
  } catch (error) {
    console.log(error);
  }
});
var metal = require("metal-name");

app.get("/band", async (req, res) => {
  try {
    await res.json({ metal: metal() });
  } catch (error) {
    console.log(error);
  }
});
var emoticon = require("emoticon.js");

app.get("/emogi", async (req, res) => {
  try {
    await res.json({ emotion: emoticon() });
  } catch (error) {
    console.log(error);
  }
});
var gpc = require("generate-pincode");

app.get("/pincode", async (req, res) => {
  try {
    var pin = gpc(4);
    await res.json({ pin });
  } catch (error) {
    console.log(error);
  }
});

app.get("/image/:tagId", async (req, res) => {
  try {
    const data = await ipp(req.params.tagId);
    await res.json({ data });
  } catch (error) {
    console.log(error);
  }
});
const port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Example app listening on port 3000!");
});
