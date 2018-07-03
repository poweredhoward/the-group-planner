// Dependencies
var path = require("path");
var db = require("../models");

// Routes
module.exports = function(app) {

    

    app.get("/", function(req, res) {
        // we're using path.join here to safely combine two filepaths
        // __dirname + "/index.html" would also work
        res.sendFile(path.join(__dirname, "../public/index.html"));
    });

    app.get("/newroom", function(req, res) {
        res.sendFile(path.join(__dirname, "../public/newroom.html"));
    });

    //Logic when user submits a form
    app.post("/:room/form", function(req,res){
        console.log(req.body);
        var categories = req.body.activity;
        var roomname = req.params.room;
        var times = req.body.times;

        console.log("Times: ");
        console.log(times);

        //Add time windows for each person
        var user_query = {
            name: req.body.person            
        };

        for( day in times){
            // var s = null;
            // var e = null;
            //Mapping time of day chosen to exact time windows
            // switch(times[day]){
            //     case "Morning":
            //         s = new Date("June 28, 2018 09:00");
            //         e = new Date("June 28 2018 13:00");
            //         break;
            //     case "Afternoon":
            //         s = new Date("June 28, 2018 13:00");
            //         e = new Date("June 28 2018 17:00");
            //         break;
            //     case "Evening":
            //         s = new Date("June 28, 2018 17:00");
            //         e = new Date("June 28 2018 21:00");
            //         break;
            //     case "Late Night":
            //         s = new Date("June 28, 2018 21:00");
            //         e = new Date("June 28 2018 24:00");
            //         break;
            // }
            // var start_day = day + "_start";
            // var end_day = day + "_end";
            var day_time = day + "_time";

            // if(s !== null && e !== null){
                // user_query[start_day] = s;
                // user_query[end_day] = e;
            user_query[day_time] = times[day];
            // }
            
        }
        console.log("This is the user query: ");
        console.log(user_query);

        // var user_query = {
        //     name: req.body.person,
        //     [start_day]: s,
        //     [end_day]: e,
            
        // };

        // console.log(s);
        // console.log(e);
       
        //Get room ID from room name
        db.Room.findOne({
            where: {
                name: roomname
            },
            raw: true
        }).then(room =>{
            
            user_query.RoomId = room.id;

            //Make only a unique user in the correct room
            db.User.findOrCreate({
                where: user_query,
                raw: true
            }).then(user => {
                // console.log(user);
                
                //Make a new entry in category table if they used a custom activity
                categories.forEach(function(category){
                    var category_query = {};
                    if(req.body.custom === ""){
                        category_query.activity = category;
                    }
                    else{
                        category_query.activity = req.body.custom;
                        category_query.isDefault = false;
                    }
                    category_query.RoomId = room.id;

                    db.Category.findOrCreate({ 
                        where: {activity: category},
                        defaults: category_query,
                        raw: true
                    }).then(function(cat){
                        console.log("New cateogry is");
                        console.log(cat);

                        //Make new entry for every category a user chose
                        db.UserCategory.create({
                            CategoryId: cat[0].id,
                            UserId: user[0].id
                        }).then(uscat =>{
                            // console.log(uscat);
                            res.end();
                        })
                    });
                });
               
                // console.log(result);
            })
        })
            
        
       
    });

    //New room
    app.post('/api/postRoom',(req,res)=>{
        var room=req.body;
        console.log(room.name)
        db.Room.findOrCreate({
            where: {name:room.name},
            raw: true
        }).then(function(){
            console.log('added!')
            res.end()
        })
    })
      
    
    //Give available categories to the front end
    app.get("/api/form/:room", (req, res)=>{
        console.log("Asking for activities available");
        //Find room id given room name
        db.Room.findOne({
            where: {
                name: req.params.room
            },
            raw: true
        }).then(room =>{
            //Give default activities or ones specific to the room
            db.Category.findAll({
                where: {
                    $or: [
                        {isDefault: true},
                        {RoomId: room.id}
                    ]
                },
                raw: true
            }).then(cats => {
                console.log(cats);
                res.json(cats);
            })
        })
        
        
    })

    //Print all users in a room
    app.get("/:room/users", function(req, res){
        db.User.findAll({
            where: { RoomId: req.params.room },
            raw: true
        }).then(users=>{
            console.log(users);

            //Get optimal category
            var category_count = {};
            users.forEach( function(user){
                
                db.UserCategory.findAll({
                    where: {UserId: user.id},
                    raw: true
                }).then(categories => {
                    console.log("These are the categories chosen by "+ user.name )
                    // console.log(categories);
                    categories.forEach(category =>{
                        if(category.CategoryId in category_count){
                            category_count[category.CategoryId] += 1;
                        } else{
                            category_count[category.CategoryId] = 1;
                        }
                    });

                    console.log("Category count: ");

                    //The object with the categories!!!
                    console.log(category_count);
                    res.end();
                });
            });
        })
    });

    

    app.get("/:room/userstimes", function(req, res){
        var num_days = 7;
        var count_obj = {};
        function entryToNum(category, daynum){
            var enumm = db.User.rawAttributes.monday_time.values;
            var multipliers = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
            var values = multipliers[enumm.indexOf(category)];
            var day = multipliers[multipliers.length -1 - daynum];
            console.log("values: "+ values)
            console.log("day: " + day)
            var hashnum =  values * day;
            var hashnums = {};
            if(hashnum in count_obj){
                count_obj[hashnum].count += 1;
                // hashnums.count += 1;
                
            } else {
                // count_obj[hashnum] = 1;
                hashnums.count = 1;
                hashnums.valuenum = values;
                hashnums.daynum = day;
                count_obj[hashnum] = hashnums;
            }
           
        }
        var days_of_week = [];

        function numToEntry(hashnum){
            var enumm = db.User.rawAttributes.monday_time.values;
            var multipliers = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
            var valuenum = count_obj[hashnum].valuenum
            var value = enumm[multipliers.indexOf(valuenum)];
            var daynum = count_obj[hashnum].daynum;
            var day = days_of_week[ multipliers.length -1 - multipliers.indexOf(daynum) ];
            // multipliers[ multipliers.length -1 - multipliers.indexOf(daynum) ];
            var best_day_time = {time: value, day: day };
            return best_day_time;

        }

        // var count_matrix = [];
        console.log(db.User.rawAttributes.monday_time.values);
        db.User.findAll({
            where: {RoomId: req.params.room},
            raw: true
        }).then(users =>{

            
            //Set up count matrix
            /*users.forEach((user, col_num) => {
                console.log(user);
                // var userArray = [];
                for(field in user){
                    // console.log(field)
                    if(field.split("_")[1] === "time"){
                        // userArray.push(0);
                        //entryToNum(user[field], col_num);
                        days_of_week.push((field.split("_")[0]));


                    }
                    
                }
                //count_matrix.push(userArray);
            });*/

            for(field in users[0]){
                // console.log(field)
                if(field.split("_")[1] === "time"){
                    // userArray.push(0);
                    //entryToNum(user[field], col_num);
                    days_of_week.push((field.split("_")[0]));
                }
                
            }

            console.log(days_of_week);

            users.forEach(user =>{
                for(var i=0 ; i<days_of_week.length ; i++){
                    var d = days_of_week[i] + "_time";
                    entryToNum(user[d], i);
                }
            })
            // console.log(count_matrix);
            console.log(count_obj);

            var max_hash = 0;
            var max_count = 0;
            for(hash in count_obj){
                if(count_obj[hash].count > max_count){
                    max_hash = hash;
                    max_count = count_obj[hash].count;
                }
            }

            console.log(numToEntry(max_hash));

            
            res.end();
        })
    })




    //Return all categories associated with a user
    app.get("/:room", function(req, res) {
        var room = req.params.room;
        //Link user table to category table through usercategory
            // console.log(result);
            
            
        
            // for (var i = 0; i < results.UserCategories.length; i++){
            //     console.log(results.UserCategories[i].activity, "category")
                
            // }
            // console.log(activities, "here are the activites")
            //   res.render("index", {activities:results});
    
        
        var userlist = [];
        db.Room.findOne({
            where: {name: room}
        }).then(room =>{
            db.User.findAll({
                where: {RoomId: room.id}
            }).then(function(allusers){
                allusers.forEach( user =>{
                    var userobj = {};
                    var activities = [];
    
                    db.User.findOne({
                        where: {
                            id: user.id
                        }, include: [{
                                model: db.UserCategory,
                                include:[{
                                    model: db.Category
                                }]
                        }]
                        
                    }).then(categories =>{
                        categories.UserCategories.forEach(cat => activities.push(cat.Category.activity));
                        console.log("user: " + user.name);
                        console.log("categories: " + activities);
                        userobj.user = user;
                        userobj.activities = activities;
                        userlist.push(userobj);
                        console.log("userlist:");
                        // console.log(userlist);
    
    
                    })
                })
               
                
                setTimeout(function(){
                    res.render("index", {users: userlist});
                }, 1000)
                // console.log(oneuser.Category.activity, "dataactivity")
                
                
            })
        })
        
    
    });



    //Get all users for a given room
    app.get("/:room", function(req, res) {
        var roomname = req.params.room;
        db.Room.findOne({
            where: {
                name: roomname
            },
            raw: true
        }).then(result =>{
            console.log(result);
            if(result === null){
                res.sendFile(path.join(__dirname, "../public/error.html"));
            }
            else{
                db.User.findAll({
                    where: {
                        RoomId: result.id
                    },
                    include: [{
                        model: db.Room
                    }],
                    raw: true
                }).then(users =>{
                    console.log(users);
                    res.sendFile(path.join(__dirname, "../public/room.html"));

                })

            }
        })
        
    });

    //Send form page to front end
    app.get("/:room/form", function(req, res) {
        var roomname = req.params.room;
        db.Room.findOne({
            where: {
                name: roomname
            },
            raw: true
        }).then(result =>{
            console.log(result);
            if(result === null){
                res.sendFile(path.join(__dirname, "../public/error.html"));
            }
            else{
                res.sendFile(path.join(__dirname, "../public/form.html"));
            }
        })
    });

    app.get("/justin/bryan", function(req,res){
       db.User.findAll({}).then(function(results){
            // console.log(results,"this is our data");
            // console.log(results[0].name, "this is the first entry");
            var arraynames = [];
            var arrayMonday = [];
            var arrayTuesday = [];
            var arrayWednesday = [];
            var arrayThursday = [];
            var arrayFriday = [];
            var arraySaturday = [];
            var arraySunday = [];
            for (var i = 0; i < results.length; i++){
                arraynames.push(results[i].name);
                if(results[i].monday_time !== ""){
                arrayMonday.push(results[i].monday_time)
            }
                if(results[i].tuesday_time !== ""){
                arrayTuesday.push(results[i].tuesday_time)
            }
                if(results[i].wednesday_time !== ""){
                arrayWednesday.push(results[i].wednesday_time)
            }
                if(results[i].thursday_time !== ""){
                arrayThursday.push(results[i].thursday_time)
            }
                if(results[i].friday_time !== ""){
                arrayFriday.push(results[i].friday_time)
            }
                if(results[i].saturday_time !== ""){
                arraySaturday.push(results[i].saturday_time)
            }
                if(results[i].sunday_time !== ""){
                arraySunday.push(results[i].sunday_time)
            }
        }
            console.log(arraynames, "this is your array output");
            
            console.log(arrayMonday, 'these are our monday dates');
            console.log(arrayTuesday, 'these are our tuesday dates');
            console.log(arrayWednesday, 'these are our wednesday dates');
            console.log(arrayThursday, 'these are our thursday dates');
            console.log(arrayFriday, 'these are our friday dates');
            console.log(arraySaturday, 'these are our saturday dates');
            console.log(arraySunday, 'these are our sunday dates');

            res.render("index", {users:results})
            
//         //     var times = [];

//         //     console.log(arraynames) */
// res.render('index',{person:people})
//         // });


    
// });
})})};

// var people=[{
//     name:"bryan"
// },
// {
//     name:"justin",
// },
// {
//     name:"matt",
// },
// {
//     name:'vanessa'
// }]}