"use-strict";
const {SparqlClient, SPARQL} = require("sparql-client-2");
const $ = require("jquery");
const RiveScript = require("rivescript");
const moment = require('moment');
require('moment/locale/pl');
const rs = new RiveScript({utf8: true});

rs.unicodePunctuation = new RegExp(/[.,!?;:]/g);
rs.loadFile("./resources/brain/index.rive", loading_done, loading_error);

const client =
    new SparqlClient("http://dbpedia.org/sparql")
    .register({
	    db: "http://dbpedia.org/resource/",
	    dbpedia: "http://dbpedia.org/property/"
});

function fetchPersonInfo(person,informationType) {
    var women = false;
    var birthVerb = "urodził";
    var deathVerb = "zmarł";

    if(person[person.length -1] == "a"){
        women = true;
    }

    if(women == true){
        birthVerb = "urodziła";
        deathVerb = "zmarła"
    }

	return new rs.Promise(function(resolve) {
		return client
            .query(SPARQL`
                PREFIX  dbpedia-owl:  <http://dbpedia.org/ontology/>
                SELECT DISTINCT ?birthDate ?deathDate WHERE {
                ?x0 rdf:type foaf:Person.
                ?x0 rdfs:label ${person}@pl.
                ?x0 dbpedia-owl:birthDate ?birthDate.
                OPTIONAL {?x0 dbpedia-owl:deathDate ?deathDate.}
            }`)
        .execute()
        .then(function(xhr) {
        	if(informationType === "birthDate"){
                var birthDate = xhr.results.bindings["0"].birthDate.value;
                birthDate = moment(birthDate).format('YYYY-MM-DD');
                birthDate = moment(birthDate).format('LL')

        		resolve(person + birthVerb + " się " + birthDate);
        	}
        	else if(informationType === "deathDate"){
                var deathDate = xhr.results.bindings["0"].deathDate.value;
                deathDate = moment(deathDate).format('YYYY-MM-DD');
                deathDate = moment(deathDate).format('LL')

                resolve(person + deathVerb  + deathDate);
        	}
        	else {
        		resolve("Data urodzenia: " + xhr.results.bindings["0"].birthDate.value + " Data śmierci: " + xhr.results.bindings["0"].deathDate.value);
        	}
    	})
        .catch(function (err) {
        	if(err.message === "xhr.results.bindings[0].deathDate is undefined")
        		resolve("Wydaje mi się, że podana osoba żyje.");
        	else (err.message === "xhr.results.bindings[0] is undefined");
        	resolve("Wydaje mi się, że podana osoba nie istnieje.");
        });
	});
}

function loading_done () {
	rs.sortReplies();
	on_load_success();
}

function loading_error (error) {
	throw new Error("Error when loading files: " + error);
}

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};


function convertSurnameToBaseForm(surname){
    const postfixes = [{fix:"iej",end:"a"},{fix:"ej",end:"a"},{fix:"ego",end:""},{fix:"y",end:"a"},{fix:"a",end:""}]

    for (let postfix of postfixes) {
        if(surname.endsWith(postfix.fix)){
            return  surname.slice(0,surname.lastIndexOf(postfix.fix)) + postfix.end;
        }
    }
}

function convertNameToBaseForm(name){
    if(name[name.length -1] == "a"){
        return name.slice(0,name.length -1)
    }

    if(name[name.length -1] == "i"){
        return name.slice(0,name.length -1) + "a"
    }
}

function convertInputToPerson(name,surname){
    const new_name = convertNameToBaseForm(name) || name;
    const new_surname = convertSurnameToBaseForm(surname) || surname;
    return `${new_name.capitalize()} ${new_surname.capitalize()}`;
}

rs.setSubroutine("getBirthDate",function(rs,args){
	const person  = `${args[0].capitalize()} ${args[1].capitalize()}`;
    console.log(person);
	return fetchPersonInfo(person,"birthDate");
});

rs.setSubroutine("getDeathDate",function(rs,args){
	const person  = `${args[0].capitalize()} ${args[1].capitalize()}`;
    console.log(person);
	return fetchPersonInfo(person,"deathDate");
});

rs.setSubroutine("getBirthDateConvert",function(rs,args){
	const person  = convertInputToPerson(args[0],args[1])
    console.log(person);
	return fetchPersonInfo(person,"birthDate");
});


rs.setSubroutine("getDeathDateConvert",function(rs,args){
    const person  = convertInputToPerson(args[0],args[1])
    console.log(person);
	return fetchPersonInfo(person,"deathDate");
});

function on_load_success () {
	$("#message").focus();
}

function getText(){
	return $("#message").val();
}

function sendMessage (input) {
	const text = input || getText();

	$("#message").val("");
	$("#dialogue").append("<div class='chat_msg'><strong class='user'>Ty:</strong> " + text + "</div>");

	try {
    	rs.replyAsync("bot", text, this).then(function(reply) {
            responsiveVoice.speak(reply,"Polish Female");
    		$("#dialogue").append("<div class='chat_msg'><strong class='bot'>DeathBot: </strong>" + reply + "</div>");
    	    $("#dialogue").scrollTop($("#dialogue")[0].scrollHeight);
    	});

	} catch(e) {
		throw new Error(e);
	}
}

const form = document.getElementById("form");

form.addEventListener("submit", function(evt){
	sendMessage();
	evt.preventDefault();
});

const recognition = new webkitSpeechRecognition();
const recordingText = document.querySelector("#voice-input");

let speech = false;
recognition.lang = "pl-PL";

recordingText.addEventListener("click", function(){
	if(!speech){
		recognition.start();
	} else{
		recognition.stop();
	}
	speech = !speech;
});

recognition.addEventListener("result", function(){
	const sentence = event.results[0][0].transcript;
	sendMessage(sentence);
});

recognition.addEventListener("speechend", function(){
	recognition.stop();
	speech = false;
});