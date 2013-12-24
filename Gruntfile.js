// http://24ways.org/2013/grunt-is-not-weird-and-hard/

module.exports = function(grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        concat: {
            // 2. Configuration for concatenating files goes here.
            dist: {
                src: [
                    '/js/angular.min.js',
                    '/js/app.js',
                    '/js/factories.js',
                    '/js/controllers.js',
                    '/js/directives.js'
                ],
                dest: 'js/build/prod-common.js'
            }
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat']);

};