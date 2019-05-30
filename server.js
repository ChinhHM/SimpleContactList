var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    MongoClient = require('mongodb').MongoClient,
    engines = require('consolidate'),
    assert = require('assert'),
    ObjectId = require('mongodb').ObjectID;

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config.json');
AWS.config.update({endpoint: "https://dynamodb.ap-southeast-1.amazonaws.com"});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();
var dbTable = "contactlist";

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

function errorHandler(err, req, res, next) {
    console.error(err.message);
    console.error(err.stack);
    res.status(500).render("error_template", { error: err});
}

var param = {
    TableName: dbTable
};


app.get('/records', function(req, res, next) {
    console.log("Scanning table " + dbTable);
    docClient.scan(param, function onScan(err, data) {
        if (err) {
            console.error("Unable to scan, error: ", JSON.stringify(err));
        }
        else {
            console.log(JSON.stringify(data));

            if (data.Count < 1){
                console.log("No records found.");
            }
            else {
                res.json(data.Items);
            };
        }
    });
});

app.post('/records', function(req, res, next){
    console.log(req.body);

    docClient.put({
        TableName: dbTable,
        Item: {
            "id": (new ObjectId()).toString(),
            "uname": req.body.uname,
            "email": req.body.email,
            "phone": req.body.phone
        }
    }, function (err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err));
        } else {
            console.log("Added item:", JSON.stringify(data));
            res.json(data);
        }
    });
});

app.delete('/records/:id', function(req, res, next){
    var id = req.params.id;
    console.log("Deleting item: " + id);

    docClient.delete({
        TableName: dbTable,
        Key: {
            "id": id.toString()
        }
    }, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));

            res.json(data);
        }
    })
});

app.put('/records/:id', function(req, res, next){
    var id = req.params.id;

    console.log("Updating item: " + id);

    docClient.update({
        TableName: dbTable,
        Key: {
            "id": id.toString()
        },
        UpdateExpression: "set uname=:n, email=:e, phone=:p",
        ExpressionAttributeValues:{
            ":n": req.body.uname,
            ":e": req.body.email,
            ":p": req.body.phone
        },
        ReturnValues:"ALL_NEW"
    }, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data));
            res.json(data);
        }
    })
});

app.use(errorHandler);
var server = app.listen(process.env.PORT || 3000, function() {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
})

