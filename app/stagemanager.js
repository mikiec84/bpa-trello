_un = require("underscore");
TrelloSuper = require("./helpers.js");
util = require('util');
Q = require('q');


function StageManager(yaml_file, board){
	TrelloSuper.call(this, yaml_file, board);
	this.Stages = this.getPreAward();
	classThis = this;
}

util.inherits(StageManager, TrelloSuper);

var method = StageManager.prototype;

method.run = function(){
	this.getStageandBoard()
	.then(this.checkLists)
  .then(this.makeAdditionalLists)
	.then(this.getStageandBoard().then(this.closeUnusedStages))
	.then(this.getStageandBoard().then(this.orderLists))
	.fin(console.log("done"))
	.fail(function (e) {
            console.error(e.name + ': ' + e.message );
  });

}

method.getStageandBoard = function(){
	var deferred = Q.defer();
	this.t.get(this.lists_url, function(err, data){
		if(err) {deferred.reject(new Error(err));};
		deferred.resolve([classThis.Stages, data]);
	});
	return deferred.promise;

}

method.checkLists = function(data){ //PASS STAGES ASYNC
	var checked = [];
	console.log("check");
	lists = _un.pluck(data[1], 'name');
	_un.each(data[0], function(stage){
		checked.push({"stage": stage["name"], "built": _un.contains(lists, stage["name"])});
	});
	return checked;
};

method.makeAdditionalLists = function(checkedList){
	console.log("makeAdd")
	var deferred = Q.defer();
	var all = [ ];
	var newLists = [ ];

	_un.each(checkedList, function(list, i){
		var listDefer = Q.defer();
		all.push(listDefer.promise);
		if (!list["built"]){
			var postList = {name: list["stage"], idBoard: classThis.board, pos: i+1};
			classThis.t.post("1/lists", postList, function(err,data){
				if (err) {
					listDefer.reject(err);
				}
				newLists.push(data);
				listDefer.resolve();
			});
		}
	});

	Q.all(all).then(function() {
		deferred.resolve(newLists);
	}).catch(function(e) {
		deferred.reject(e);
	})

	return deferred.promise;
};

method.closeUnusedStages = function(data){
	console.log("close");
	stages = _un.pluck(data[0], 'name'); //Grab stage names
	// For each list
	_un.each(data[1], function(trelloList){
		if (!(_un.contains(stages, trelloList["name"]))){
			classThis.getListCards(trelloList["id"], function(d){
				classThis.closeList(d, trelloList["id"])
			});
		};
	});
	return;
}

method.getListCards = function(trelloID, callback){
	this.t.get("/1/lists/"+trelloID+"/cards", function(err, data){
		if(err) throw err;
		callback(data);
	});
}

method.closeList = function(listData, trelloID){
	if (listData.length === 0){
		classThis.t.put("/1/list/"+trelloID+"/closed", {value: true}, function(e, success){
		});
	}
}


method.orderLists = function(data){
	console.log("order")
	var position = 0;
	_un.each(data[0], function(stage, i){
		appropriateList = _un.findWhere(data[1], {name: stage["name"]})
		if(appropriateList) {
			listID = appropriateList["id"];
			classThis.t.put("1/lists/"+listID+"/pos", {value: position}, function(e, data) {
				if (e) {throw e};
			});
			position++;
		}
	});
}

module.exports = StageManager;
