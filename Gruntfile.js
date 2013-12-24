// http://24ways.org/2013/grunt-is-not-weird-and-hard/

module.exports = function(grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // Concatenate JS files
        concat: {
            dist: {
                src: [
                    'js/angular.min.js',
                    'js/app.js',
                    'js/factories.js',
                    'js/controllers.js',
                    'js/directives.js'
                ],
                dest: 'js/build/prod-common.js'
            }
        },

        // Minify JS files
        uglify: {
            build: {
                src: 'js/build/prod-common.js',
                dest: 'js/build/prod-common.min.js'
            }
        }


    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat', 'uglify']);

};