import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp(functions.config().firebase);
const ig = require("instagram-scraping");
const findHashtags = require("find-hashtags");
const db = admin.firestore();
const rt = admin.database();
const { BigQuery } = require("@google-cloud/bigquery");
const bigquery = new BigQuery();
const dataset = "scrapinstav1";
const bq = bigquery.dataset(dataset);
const translate = require("translate-google");
/*
const bud = require("basic-instagram-user-details");
const instory = require("instory");
const ipp = require("instagram-profile-picture");
*/

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
declare const Promise: any;
declare const JSON: any;
declare const Date: any;

const language = require("@google-cloud/language");
const client = new language.LanguageServiceClient();

const vision = require("@google-cloud/vision");
const clientimage = new vision.ImageAnnotatorClient();

export const ImagetoText = functions.https.onRequest(async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  const record: any = JSON.parse(req.body);
  console.log(record);

  const [result] = await clientimage.textDetection(record.content);
  const detections = result.textAnnotations;
  console.log("Text:");
  detections.forEach((text: any) => console.log(text));

  return res.json(detections);
});

export const analyzeSyntax = functions.https.onRequest(async (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  const record: any = JSON.parse(req.body);
  console.log(record);

  const document = {
    content: record.content,
    type: "PLAIN_TEXT"
  };

  const [syntax] = await client.analyzeSyntax({ document });

  console.log("Tokens:");
  syntax.tokens.forEach((part: any) => {
    console.log(`${part.partOfSpeech.tag}: ${part.text.content}`);
    console.log(`Morphology:`, part.partOfSpeech);
  });
  return res.json(syntax.tokens);
});

export const taskRunner = functions
  .runWith({ memory: "2GB" })
  .pubsub.schedule("0 * * * *")
  .timeZone("America/Lima")
  .onRun(async context => {
    const hashtags = "memes";

    const route = `post/${hashtags}`;
    // const jobs: Promise<any>[] = [];
    const jobs: any = [];
    const result = await ig.scrapeTag(hashtags);
    //jobs.push(result);
    const getlastdate = await rt.ref(route).once("value");
    const lastdate = getlastdate.val();
    const medias = result.medias;
    console.log(medias.length);
    const array: any = [];
    medias.forEach((entry: any) => {
      if (!entry.date) return false;
      if (lastdate.date < entry.date * 1000) {
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
          upload: true
        };
        array.push(objj);
        const bqjobs = bq.table("post").insert({
          media_id: objj.media_id,
          hashtagslength: objj.hashtagslength,
          thumbnail: objj.thumbnail,
          datetime: objj.datetime,
          name: objj.name,
          otherhashtags: objj.hashtags.toString(),
          hashtags,
          like_count: objj.like_count,
          comment_count: objj.comment_count
        });
        jobs.push(bqjobs);
        const query = db
          .collection("documents")
          .doc(entry.media_id)
          .set(objj);
        return jobs.push(query);
      }
    });
    console.log(
      "ultimo registrado => ",
      new Date(lastdate.date).toLocaleString("en-US", {
        timeZone: "America/Lima"
      })
    );

    console.log("total añadido => ", array.length);
    if (array.length) {
      console.log(
        "ultimo post => ",
        new Date(array[0].date).toLocaleString("en-US", {
          timeZone: "America/Lima"
        })
      );
      const set = rt
        .ref(route)
        .set({ date: array[0].date, total: array.length });
      jobs.push(set);
    }

    //const now = admin.firestore.Timestamp.now();

    return await Promise.all(jobs);
  });

export const translateJob = functions
  .runWith({ memory: "2GB" })
  .pubsub.schedule("* * * * *")
  .timeZone("America/Lima")
  .onRun(async () => {
    const limit = 5;
    const dataarray: any = [
      {
        table: `scrapbinder.newlearn.english_dic`,
        to: `english`,
        from: `translate`,
        idiom: `es`
      },
      {
        table: `scrapbinder.newlearn.translate_dic`,
        to: `translate`,
        from: `english`,
        idiom: `en`
      }
    ];
    //const jobs: any = [];
    return dataarray.forEach(async (data: any) => {
      const query = `SELECT ${data.to}
  FROM \`${data.table}\`
  WHERE
  ${data.from} is null
  LIMIT ${limit} `;

      // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
      const options = {
        query,
        // Location must match that of the dataset(s) referenced in the query.
        location: "US"
      };

      // Run the query as a job
      const [job] = await bigquery.createQueryJob(options);
      console.log(`Job ${job.id} started.`);

      // Wait for the query to finish
      const [rows] = await job.getQueryResults();

      // Print the results
      const quores: any = [];
      if (!rows.length) {
        return false;
      }
      rows.forEach((row: any) => {
        return quores.push(row[data.to]);
      });
      const translatequotes = await translate(quores, { to: data.idiom });

      for (let index = 0; index < translatequotes.length; index++) {
        console.log(quores[index], "=>", translatequotes[index]);
      }
      return translatequotes.forEach(
        async (quotetranslate: any, index: any) => {
          const querytranslate = ` 
      UPDATE \`${data.table}\`
      SET ${data.from} = "${quotetranslate}"
      WHERE
      ${data.to} = "${quores[index]}"
      `;
          const optionstranslate = {
            query: querytranslate,
            // Location must match that of the dataset(s) referenced in the query.
            location: "US"
          };

          // Run the query as a job
          return await bigquery.createQueryJob(optionstranslate);
          //jobs.push();
        }
      );
    });
    //await Promise.all(jobs);
  });
