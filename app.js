//loading dependinces
require('dotenv').config()
const express = require('express');
const app = express();
const ejs = require("ejs");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
const {
    check,
    validationResult
} = require('express-validator')
const {
    ensureAuthenticated,
    forwardAuthenticated
} = require('./config/auth');
const User = require('./models/User');

require('./config/passport')(passport);
const {
    response
} = require("express");

//for flash messages
app.use(cookieParser(process.env.SECRET))
app.use(
    session({
        secret: process.env.SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: null
        }
    })
);
//cookie middleware for messages
app.use((req, res, next) => {
    res.locals.message = req.session.message
    delete req.session.message
    next()
})

mongoose.connect(`mongodb+srv://admin-kaushik:${process.env.DBPASSWORD}@cluster0.gpymw.mongodb.net/ieeepes?retryWrites=true&w=majority`, {

    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoose.connection
    .once('open', () => {
        console.log(`connected to database`)
    })
    .on('error', (err) => {
        console.log(`error: ${err}`)
    });
mongoose.set('useFindAndModify', false);

//express middleware


app
    .use(bodyParser.urlencoded({
        extended: true
    }))
    .use(express.static(__dirname + '/public'))
    .set("view engine", "ejs")
    .use('/blog', express.static(__dirname + '/public'))
    .use('/admin/message', express.static(__dirname + '/public'));
app.use(
    session({
        secret: process.env.SECRET,
        resave: true,
        saveUninitialized: true,
        cookie: {
            maxAge: null
        }
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


//========mongodb schemas=========//

const blogSchema = {
    title: String,
    text: String,
    date: String,
    link: String,
    image: String,
    views: Number
};

const messageSchema = {
    name: String,
    email: String,
    number: String,
    message: String,
    date: String,
};
const registrationSchema = {
    name: String,
    RegisterNumber: String,
    number: String,
    email: String,
    // branch: String,
    // domains: String
};

const subscribeSchema = {
    email: String,
}

const Blog = mongoose.model('Blog', blogSchema);
const Message = mongoose.model('Message', messageSchema);
const Registration = mongoose.model('Registration', registrationSchema);
const Subscribe = mongoose.model('Subscribe', subscribeSchema);

//========get routes =====//
app.get('/', (req, res) => {
    console.log("get home route /");
    Blog.find({}).limit(3).sort({
        '_id': -1
    }).then((blogs) => {
        res.render('home', {
            posts: blogs
        })
    })
});

app.get('/blog/:link', (req, res) => {
    Blog.findOne({
        link: req.params.link
    }, (err, post) => {
        if (err) {
            res.redirect('/')
        }
        if (post != null) {
            number = 0;
            number = post.views + 1;
            Blog.findOneAndUpdate({
                _id: post.id
            }, {
                $set: {
                    "views": number
                }
            }, (err, post) => {
                if (err) res.redirect('/')
            })
            res.render('post', {
                title: post.title,
                content: post.text,
                image: post.image
            })
        } else {
            res.redirect('/')
        }
    })
});

app.get('/blogs', (req, res) => {
    Blog.find({}).sort({
        '_id': -1
    }).then((blogs) => {
        res.render('blogs', {
            posts: blogs
        })
    })
});

app.get('/about', (req, res) => {
    res.render('about')
});

app.get('/contact', (req, res) => {
    res.render('contact')
});
app.get('/events', (req, res) => {
    res.render('events')
});
app.get('/admin', ensureAuthenticated, (req, res) => {
    Message.find({}).sort({
        '_id': -1
    }).then((messages) => {
        Blog.find({}).then((blogs) => {
            User.find({}).then((users) => {
                Registration.find({}).then((registrations) => {
                    res.render('admin', {
                        messages,
                        blogs,
                        users,
                        registrations,
                        user: req.user
                    })
                })
            })
        })
    })
});
app.get('/admin/message/:id', ensureAuthenticated, (req, res) => {
    Message.findById({
        _id: req.params.id
    }, (err, data) => {
        if (!err) {
            res.render('message', {
                id: data.id,
                date: data.date,
                name: data.name,
                email: data.email,
                number: data.number,
                message: data.message
            })
        } else {
            res.redirect('/admin')
        }
    })
})
app.get('/login', forwardAuthenticated, (req, res) => {
    res.render('login')
})

app.get('/message/delete/:id', ensureAuthenticated, (req, res) => {
    Message.findByIdAndDelete({
        _id: req.params.id
    }).then(
        res.redirect('/admin')
    )
});
app.get('/blog/delete/:id', ensureAuthenticated, (req, res) => {
    Blog.findByIdAndDelete({
        _id: req.params.id
    }).then(
        res.redirect('/admin')
    )
});
app.get('/subscriber/delete/:id', ensureAuthenticated, (req, res) => {
    Subscribe.findByIdAndDelete({
        _id: req.params.id
    }).then(
        res.redirect('/admin')
    )
});
app.get('/register', (req, res) => {
    res.render('register')
});
app.get('/sitemap', (req, res) => {
    res.sendFile(__dirname + '/sitemap.xml')
})


//=======post routes============//

app.post('/register', ensureAuthenticated, (req, res) => {
    if (req.user.email == 'kaushikappani@gmail.com') {
        const newUser = new User({
            email: req.body.emailadd,
            password: req.body.passwordadd
        });
        bcrypt.genSalt(12, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {

                if (err) return err;
                newUser.password = hash;
                newUser.save()
                    .then(user => {
                        res.redirect('/admin')
                    })
                    .catch(err => {
                        res.status(400).send(err)
                    })
            })
        })
    } else {
        res.send({
            message: "only admin can add users"
        })
    }
})


app.post('/contact', (req, res) => {
    const message = new Message({
        name: req.body.firstName + req.body.lastName,
        email: req.body.email,
        number: req.body.phone,
        message: req.body.message,
        date: new Date()
    });
    message.save().then(() => {
        req.session.message = {
            message: "Your message has reached us we will contact you soon",
            role: "alert-success",

        }
        res.redirect('/contact')
    }).catch((err) => {
        req.session.message = {
            message: "Error Please try again",
            role: "alert-warning",

        }
        res.redirect('/contact')
    })
})


app.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/admin',
        failureRedirect: '/login',
        failureFlash: false
    })(req, res, next);
});


app.post('/blogpost', ensureAuthenticated, (req, res) => {
    const blog = new Blog({
        title: req.body.title.split('"').join(''),
        text: req.body.content.split('"').join(''),
        date: new Date(),
        image: req.body.image,
        link: req.body.title.split(' ').join(''),
        views: 0
    });
    blog.save().then(() => {
        res.redirect('/admin')
    }).catch((err) => {
        res.redirect('/admin')
    })
});

app.post('/subscribe', (req, res) => {
    if (req.body.email == "") {
        req.session.message = {
            message: "Email is required field",
            role: "alert-warning",

        }
        res.redirect('/')
    } else {
        const subscriber = new Subscribe({
            email: req.body.email,
        });
        Subscribe.findOne({
            email: req.body.email
        }, (err, post) => {
            if (post != null) {
                req.session.message = {
                    message: "You have registered previously",
                    role: "alert-warning",
                }
                res.redirect('/')
            } else {
                subscriber.save().then(() => {
                    req.session.message = {
                        message: "Registered successfully",
                        role: "alert-success",
                    }
                    res.redirect('/')
                })
            }
        })
    }
})


app.post('/eventregister', (req, res) => {
    // let domainSelected = '';
    // let noOfDomains = 0;
    // if (req.body.check1 == 'on') {
    //     domainSelected = domainSelected + ' Technical CSE';
    //     noOfDomains++
    // }
    // if (req.body.check2 == 'on') {
    //     domainSelected = domainSelected + ' Technical non-CSE';
    //     noOfDomains++
    // }
    // if (req.body.check3 == 'on') {
    //     domainSelected = domainSelected + ' Management';
    //     noOfDomains++
    // }
    // if (req.body.check4 == 'on') {
    //     domainSelected = domainSelected + ' Editorial';
    //     noOfDomains++
    // }
    // if (req.body.check5 == 'on') {
    //     domainSelected = domainSelected + ' Design';
    //     noOfDomains++
    // }

    const registration = new Registration({
        name: req.body.name,
        RegisterNumber: req.body.regno,
        number: req.body.number,
        email: req.body.email,
        // branch: req.body.branch,
        // domains: `${domainSelected}`
    });
    Registration.findOne({
        email: req.body.email
    }, (err, post) => {
        if (post != null) {
            req.session.message = {
                message: 'You have registerd with this email previously',
                role: 'alert-warning',
            }
            res.redirect('/register')
        } else {
            registration.save().then(() => {
                req.session.message = {
                    message: "Registered successfully",
                    role: "alert-success",
                }
                res.redirect('/register')
            }).catch((err) => {
                req.session.message = {
                    message: "Please try again",
                    role: "alert-warning",
                }
                res.redirect('/register')
            })

        }
    })
})


app.post('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

//// error page ////

app.get('*', (req, res) => {
    res.render('404')
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`server running in port ${port}`);
})
/// the end ///