var express = require('express')
var http = require('http')
var path = require('path')
var reload = require('reload')
var bodyParser = require('body-parser')
var logger = require('morgan')
var fs = require('fs')
var xml2js = require('xml2js')

var app = express()
var fantasyGroundState = null;
var idToCreature = {};

var parser = new xml2js.Parser()
const current_database_filename = 'c:\\Users\\xbl\\CloudStation\\FantasyGrounds-Sync\\campaigns\\Saska SKT\\db.xml';


var publicDir = path.join(__dirname, 'public')

app.set('port', process.env.PORT || 3000)
app.use(logger('dev'))
app.use(bodyParser.json()) //parses json, multi-part (file), url-encoded

app.get('/', function(req, res) {
  res.sendFile(path.join(publicDir, 'index.html'))
})

app.get('/data', function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(fantasyGroundState));
})

app.get('/combat', function(req, res) {
  // fantasyGroundState.root.combattracker.list
  res.setHeader('Content-Type', 'application/json');

  var output = {}


  var keys = Object.keys(idToCreature);
  // console.log(keys)
  for (var i = 0; i < keys.length; i++) {
    var creatureId = keys[i]
    var val = idToCreature[creatureId];

    // console.log(val);

    var name = getCreatureName(creatureId)
    var max_hp = getCreatureMaxHealthPoints(creatureId);
    var wound_hp = getCreatureWoundedHealthPoints(creatureId);
    var current_hp = max_hp - wound_hp;

    output[name] = {
      name: name,
      hp: {
        max: max_hp,
        wound: wound_hp,
        current: current_hp
      },
      status: getCreatureStatus(creatureId),
      player_character: isCreatureAPlayer(creatureId),
      visible: isCreatureTokenVisible(creatureId),
      initiative: getCreatureInitiativeResult(creatureId),
      active_turn: isCreaturesTurn(creatureId)
    }
  }

  res.send(JSON.stringify(output));
})

var server = http.createServer(app)

// Reload code here
// reload(server, app)

reloadServer = reload(server, app);

fs.watch(__dirname + "/server.js", function (eventType, filename) {
    // Fire server-side reload event
    console.log("=== " + __dirname + "/server.js changed...");
    reloadServer.reload();
    //rereadFantasyGroundDatabase();
});

fs.watch(current_database_filename, function (eventType, filename) {
    // Fire server-side reload event
    console.log("=== " + current_database_filename + " changed...");
    reloadServer.reload();
    rereadFantasyGroundDatabase();
});

server.listen(app.get('port'), function() {
  console.log("Web server listening on port " + app.get('port'));
  rereadFantasyGroundDatabase();
});

rereadFantasyGroundDatabase = () => {
  fs.readFile(current_database_filename, (err, data) => {
    try {
      parser.parseString(data, (err, result) => {
        // console.dir(result.root.combattracker)
        fantasyGroundState = result
        processCombatTrackerData()
        // console.log("Done")
      })
    } catch(e) {
      console.warn("*** FAILED TO PARSE XML FILE ***")
      console.log(e)
    }

  })
}

processCombatTrackerData = () => {
  fantasyGroundState.root.combattracker[0].list.forEach((item) => {
    var keys = Object.keys(item);
    for (var i = 0; i < keys.length; i++) {
        var val = item[keys[i]];
        if (val.length === 0 || val === '' || val[0].name === undefined) {
          continue
        }

        idToCreature[keys[i]] = item[keys[i]][0]
    }
  });
}

getCreatureStatus = (creatureId) => {
  if (idToCreature[creatureId].status === undefined) {
    return null;
  }

  return idToCreature[creatureId].status[0]._
}

getCreatureName = (creatureId) => {
  if (idToCreature[creatureId].name === undefined) {
    return null;
  }

  return idToCreature[creatureId].name[0]._
}

getCreatureMaxHealthPoints = (creatureId) => {
  if (idToCreature[creatureId].hp === undefined) {
    if (idToCreature[creatureId].hptotal === undefined) {
      return null
    } else {
      return parseInt(idToCreature[creatureId].hptotal[0]._)
    }
  }

  return parseInt(idToCreature[creatureId].hp[0]._)
}

getCreatureWoundedHealthPoints = (creatureId) => {
  if (idToCreature[creatureId].wounds === undefined) {
    return null;
  }

  return parseInt(idToCreature[creatureId].wounds[0]._)
}

getCreatureInitiativeBonus = (creatureId) => {
  if (idToCreature[creatureId].init === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].init[0]._)
}

getCreatureInitiativeResult = (creatureId) => {
  if (idToCreature[creatureId].initresult === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].initresult[0]._)
}

getCreatureSpeed = (creatureId) => {
  if (idToCreature[creatureId].speed === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].speed[0]._)
}

getCreatureSpaceOccupation = (creatureId) => {
  if (idToCreature[creatureId].space === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].space[0]._)
}

getCreatureAbilityStats = (creatureId) => {
  return {
    "strength": parseInt(idToCreature[creatureId].strength[0].score[0]._),
    "dexterity": parseInt(idToCreature[creatureId].dexterity[0].score[0]._),
    "constitution": parseInt(idToCreature[creatureId].constitution[0].score[0]._),
    "wisdom": parseInt(idToCreature[creatureId].wisdom[0].score[0]._),
    "strength": parseInt(idToCreature[creatureId].strength[0].score[0]._),
    "charisma": parseInt(idToCreature[creatureId].charisma[0].score[0]._),
  }
}

getCreatureArmorClass = (creatureId) => {
  if (idToCreature[creatureId].ac === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].ac[0]._)
}

isCreatureTokenVisible = (creatureId) => {
  if (idToCreature[creatureId].tokenvis === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].tokenvis[0]._) === 1
}

isCreatureAPlayer = (creatureId) => {
  if (idToCreature[creatureId].link === undefined) {
    return null
  }

  return "charsheet" === idToCreature[creatureId].link[0].class[0]
}

getCreatureDeathSaveCount = (creatureId) => {
  if (!isCreatureAPlayer(creatureId)) {
    return null
  }

  var failed = 0;
  var success = 0;
  if (idToCreature[creatureId].deathsavefail !== undefined) {
    failed = parseInt(idToCreature[creatureId].deathsavefail[0]._)
  }

  if (idToCreature[creatureId].deathsavesuccess !== undefined) {
    success = parseInt(idToCreature[creatureId].deathsavesuccess[0]._)
  }

  return {
    success: success,
    fail: failed
  }
}

isCreaturesTurn = (creatureId) => {
  if (idToCreature[creatureId].active === undefined) {
    return null
  }

  return parseInt(idToCreature[creatureId].active[0]._) === 1
}
