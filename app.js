// require modules
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

// use required modules
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// create a new database
mongoose.connect("mongodb+srv://<username>:<password>@cluster0.e0jml.mongodb.net/<database?retryWrites=true&w=majority", { useNewUrlParser: true });

// create items schema
const itemsSchema = {
    name: String,
};

// create new mongoode model based on items schema
const Item = mongoose.model("Item", itemsSchema);

// pre-loaded items on todo list
const item1 = new Item({
    name: "Welcome to your todolist!"
});

const item2 = new Item({
    name: "Hit the + button to add a new item."
});

const item3 = new Item({
    name: "<-- Hit this to delete an item."
});

// default items array
const defaultItems = [item1, item2, item3];

// custom list schema
const listSchema = {
    name: String,
    items: [itemsSchema]
};

// mongoose model
const List = mongoose.model("List", listSchema);


app.set("view engine", "ejs");

// main to do list
app.get("/", function (req, res) {

    Item.find({}, function (err, foundItems) {

        // if todo list is empty, insert default items
        if (foundItems.length === 0) {

            // insert items into the item collection
            Item.insertMany(defaultItems, function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Successfully saved our default items to db");
                }
            });

            //then redirect back into root route to render list
            res.redirect("/");

            // otherwise, render todolist 
        } else {
            res.render("list", { listTitle: "Today", newListItems: foundItems });

        }
    });

});

// user created custom list
app.get("/:customListName", function (req, res) {
    const customListName = _.capitalize(req.params.customListName);

    // check to see if user created custom list already exists
    List.findOne({ name: customListName }, function (err, foundList) {
        if (!err) {
            if (!foundList) {
                // create a new list
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });
                // save list and redirect to webpage of custom list name
                list.save();
                res.redirect("/" + customListName);

            } else {
                // show an existing list
                res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
            }
        }
    });

});


// post route
app.post("/", function (req, res) {

    const itemName = req.body.newItem;

    const listName = req.body.list;

    // create new item document using itemName
    const item = new Item({
        name: itemName
    });

    // if user is on home page, save list to home page
    if (listName === "Today") {
        // mongoose shortcut - save new item to item collection
        item.save();
        // redirect to home page to render new item on the screen
        res.redirect("/");

        // otherwise find the name of the list that the user is on
        // and save the item to the user created custom made list
    } else {
        List.findOne({ name: listName }, function (err, foundList) {
            foundList.items.push(item);
            foundList.save();
            res.redirect("/" + listName);
        });
    }
});

// delete route
app.post("/delete", function (req, res) {
    const checkedItemId = req.body.checkbox;

    // check the value of list name
    const listName = req.body.listName;
    if (listName === "Today") {

        Item.findByIdAndRemove(checkedItemId, function (err) {
            if (err) {
                console.log(err)
            } else {
                console.log("Successfully deleted checked item.")
                res.redirect("/");
            }
        });

    } else {
        // find list name that corresponds to custom created list
        // pull from the items array that has an id that corresponds to the checked items id
        List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, function (err, foundList) {
            if (!err) {
                res.redirect("/" + listName);
            }
        });
    }


});

app.listen(process.env.PORT || 3000, () => console.log("App listening"));