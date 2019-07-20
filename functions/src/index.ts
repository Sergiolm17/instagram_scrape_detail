import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp(functions.config().firebase);
const ig = require("instagram-scraping");
const findHashtags = require("find-hashtags");
const db = admin.firestore();
const rt = admin.database();
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery();
const dataset = "scrapinstav1";
const bq = bigquery
.dataset(dataset)


/*
const bud = require("basic-instagram-user-details");
const instory = require("instory");
const ipp = require("instagram-profile-picture");
*/

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
declare const Promise: any;
//declare const JSON: any;
declare const Date: any;

/*
export const helloWorld = functions.https.onRequest(async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  const record: any = JSON.parse(req.body);
  console.log(record);
  const result = await ig.scrapeTag(record.id);
  const medias = result.medias;
  const array: any = [];
  console.log(medias[0]);
  await medias.forEach((entry: any) => {
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
    res.json(array);
});
});

exports.helloWorld = (req: any, res: any) => {
  let message = req.query.message || req.body.message || "Hello World!";
  res.status(200).send(message);
};
 */

export const taskRunner = functions
  .runWith({ memory: "2GB" })
  .pubsub.schedule("0 * * * *")
  .timeZone("America/Lima")
  .onRun(async context => {
    // const jobs: Promise<any>[] = [];
    const jobs: any = [];
    const result = await ig.scrapeTag("Huancayo");
    //jobs.push(result);
    const getlastdate = await rt.ref("post/huancayo").once("value");
    const lastdate = getlastdate.val()
    const medias = result.medias;
    const array: any = [];
    medias.forEach((entry: any) => {
      if (lastdate.date< entry.date *1000 ) {
        const objj = {
          shortcode: entry.shortcode,
          owner_id: entry.owner_id,
          media_id: entry.media_id,
          name: entry.text,
          hashtags: findHashtags(entry.text),
          hashtagslength: findHashtags(entry.text).length,
          thumbnail: entry.thumbnail,
          like_count: entry.like_count.count,
          date: entry.date * 1000,
          datetime: new Date(entry.date * 1000),
          dateformat: new Date(entry.date * 1000).toLocaleString("en-US", {
            timeZone: "America/Lima"
          }),
          comment_count: entry.comment_count.count,
          upload:true
        };
        array.push(objj);
        const bqjobs = bq.table("post").insert({
          media_id:objj.media_id,
          hashtagslength:objj.hashtagslength,
          thumbnail:objj.thumbnail,
          datetime:objj.datetime,
          name:objj.name,
          otherhashtags:objj.hashtags.toString(),
          hashtags:"huancayo",
          like_count:objj.like_count,
          comment_count:objj.comment_count
        });
        jobs.push(bqjobs);
        const query = db.collection("documents").doc(entry.media_id).set(objj);
        jobs.push(query);
      }
    });
    console.log("ultimo registrado => ",
    new Date(lastdate.date).toLocaleString("en-US", {
      timeZone: "America/Lima"
    }));
    
    console.log("total añadido => ",array.length)
    if(array.length){
      console.log("ultimo post => ",
    new Date(array[0].date).toLocaleString("en-US", {
      timeZone: "America/Lima"
    }));
      const set = rt
      .ref("post/huancayo")
      .set({ date: array[0].date ,
        total: array.length});
        jobs.push(set);
      }

    //const now = admin.firestore.Timestamp.now();

    return await Promise.all(jobs);
  });
