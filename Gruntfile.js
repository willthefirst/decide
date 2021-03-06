// http://24ways.org/2013/grunt-is-not-weird-and-hard/

module.exports = function(grunt) {

	// 1. All configuration goes here
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// Concatenate JS files
		concat: {
			dist: {
				src: [
				'extension/js/angular.min.js',
				'extension/js/extension.js',
				'extension/js/factories.js',
				'extension/js/controllers.js',
				'extension/js/directives.js'
				],
				dest: 'extension/js/build/prod-common.js'
			}
		},

		// Minify JS files
		uglify: {
			build: {
				src: 'extension/js/build/prod-common.js',
				dest: 'extension/js/build/prod-common.min.js'
			}
		},

		// Run compass on our scss files.
		compass: {
			dist: {
				options: {
					cssDir : "extension/css",
					sassDir  : "scss"
				}
			}
		},

		// Testing

		karma: {
			unit: {
				background: false,
				configFile: 'tests/karma.conf.js'
			}
		},

		// Watch files and run tasks when they change
		watch: {
			scripts: {
				files: ['extension/js/*.js'],
				tasks: ['concat', 'uglify'],
				options: {
					spawn: false,
				},
			},

			css: {
				files: ['scss/*'],
				tasks: ['compass'],
				options: {
					spawn: false,
				}
			}

			// karma: {
			// 	files: ['extension/js/**/*.js','tests/**/*.js'],
			//     tasks: ['karma:unit:run'] //NOTE the :run flag
			// }
		},

		compress: {
		  main: {
		    options: {
		      archive: 'extension.zip'
		    },
		    files: [
		      { src: ['extension'], dest: '/' } // includes files in path
		    ]
		  }
		}
	});

	// 3. Where we tell Grunt we plan to use this plug-in.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-compass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-compress');
	// grunt.loadNpmTasks('grunt-karma');

	// 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
	grunt.registerTask('default', ['concat', 'compass', 'watch', 'compress']);
	// grunt.registerTask('prod', ['concat', 'uglify', 'compass', 'watch']);

};