const {SparqlClient, SPARQL} = require('sparql-client-2');
const RiveScript = require("rivescript");

const rs = new RiveScript({utf8: true});

rs.unicodePunctuation = new RegExp(/[.,!?;:]/g);
rs.loadFile("./resources/brain/index.rive", loading_done, loading_error);

const client =
  new SparqlClient('http://dbpedia.org/sparql')
    .register({
      db: 'http://dbpedia.org/resource/',
      dbpedia: 'http://dbpedia.org/property/'
    });

function fetchPersonInfo(person,informationType) {
     return new rs.Promise(function (resolve, reject) {
         return client
           .query(SPARQL`
                PREFIX  dbpedia-owl:  <http://dbpedia.org/ontology/>\
                SELECT DISTINCT ?birthDate ?deathDate WHERE {\
                ?x0 rdf:type foaf:Person.\
                ?x0 rdfs:label ${person}@pl.\
                ?x0 dbpedia-owl:birthDate ?birthDate.\
                OPTIONAL {?x0 dbpedia-owl:deathDate ?deathDate.}\
                }`)
        .execute()
	    .then(function(xhr, data) {
            if(informationType === "birthDate"){
                resolve("Data urodzenia: " + xhr.results.bindings["0"].birthDate.value)
            }
            else if(informationType === "deathDate"){
                resolve("Data śmierci: " + xhr.results.bindings["0"].deathDate.value);
            }
            else {
                resolve("Data urodzenia: " + xhr.results.bindings["0"].birthDate.value + " Data śmierci: " + xhr.results.bindings["0"].deathDate.value);
            }
	    })
        .catch(function (err) {
            console.log(err.message);
            if(err.message === "xhr.results.bindings[0].deathDate is undefined")
                resolve("Wydaje mi się, że podana osoba żyje.");
            else (err.message === "xhr.results.bindings[0] is undefined")
                resolve("Wydaje mi się, że podana osoba nie istnieje.");
            console.log(err);
        });
	});
}

function loading_done (batch_num) {
    rs.sortReplies();
}

function loading_error (error) {
    console.log("Error when loading files: " + error);
}

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

rs.setSubroutine("getBirthDate",function(rs,args){
    person  = args[0].capitalize() + " " +args[1].capitalize()

    return fetchPersonInfo(person,"birthDate");
});

rs.setSubroutine("getDeathDate",function(rs,args){
    person  = args[0].capitalize() + " " +args[1].capitalize()

    return fetchPersonInfo(person,"deathDate");
});

function on_load_success () {
    $("#message").focus();
}

function on_load_error (err) {
    console.log("Loading error: " + err);
}

function getText(){
    return $("#message").val();
}

function sendMessage (input) {
    const text = input || getText();

    $("#message").val("");
    $("#dialogue").append("<div class='chat_msg'><strong class='user'>Ty:</strong> " + text + "</div>");

    try {
    	rs.replyAsync("soandso", text, this).then(function(reply) {

    		$("#dialogue").append("<div class='chat_msg'><strong class='bot'>DeathBot: </strong>" + reply + "</div>");
    	    $('#dialogue').scrollTop($('#dialogue')[0].scrollHeight);
    	});

    } catch(e) {
    	console.log(e);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const form = document.getElementById("form");

form.addEventListener('submit', function(evt){
    sendMessage();
    evt.preventDefault();
});

const recognition = new webkitSpeechRecognition();
const recordingText = document.querySelector("#voice-input");

let speech = false;
recognition.lang = 'pl-PL';

recordingText.addEventListener("click", function(event){
	if(!speech){
		recognition.start();
	} else{
		recognition.stop();
	}
	speech = !speech;
});

recognition.addEventListener("result", function(event){
    const sentence = event.results[0][0].transcript;

    sendVoiceMessage(sentence);
});

recognition.addEventListener("speechend", function(event){
	recognition.stop();
	speech = false;
});
