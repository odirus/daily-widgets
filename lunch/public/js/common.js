"use stricts";

requirejs.config({
    baseUrl: "/public/js/lib",
    paths: {
	app: "/public/js/app",
	jquery: "jquery-1.11.1",
	async: "async",
	tether: "tether.min",
	dropControl: "drop",
	bootstrap: "bootstrap",
	underscore: "underscore-min"
    },
    shim: {
	
    }
});
