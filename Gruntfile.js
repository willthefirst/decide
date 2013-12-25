// http://24ways.org/2013/grunt-is-not-weird-and-hard/

module.exports = function(grunt) {

    // 1. All configuration goes here
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // Concatenate JS files
        concat: {
            dist: {
                src: [
                    'app/js/angular.min.js',
                    'app/js/app.js',
                    'app/js/factories.js',
                    'app/js/controllers.js',
                    'app/js/directives.js'
                ],
                dest: 'app/js/build/prod-common.js'
            }
        },

        // Minify JS files
        uglify: {
            build: {
                src: 'app/js/build/prod-common.js',
                dest: 'app/js/build/prod-common.min.js'
            }
        },

        // Run compass on our scss files.
        compass: {
            dist: {
                  options: {
                    config: 'app/config.rb'
                }
            }
        },

        // Testing

        karma: {
          unit: {
            configFile: 'tests/karma.conf.js'
          }
        },

        // Watch files and run tasks when they change
        watch: {
            scripts: {
                files: ['app/js/*.js'],
                tasks: ['concat', 'uglify'],
                options: {
                    spawn: false,
                },
            },

            css: {
                files: ['app/scss/*'],
                tasks: ['compass'],
                options: {
                    spawn: false,
                }
            }
        }
    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat', 'compass',  'watch']);
    // grunt.registerTask('prod', ['concat', 'uglify', 'compass', 'watch']);

};