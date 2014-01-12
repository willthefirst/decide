'use strict';


describe('my services', function () {
    beforeEach(module('sb.services'));

    describe('version', function () {
        it('should return current version', inject(function(version) {
            expect(version).toEqual('0.0.1');
        }));
    });
});

describe('Options controller', function() {
    var $compile;
    var $rootScope;
    var storage = {
      getAllLocalInfo: function (){
        return {
           entries : [
               {
                   domain: "facebook.com",
                   periodBeingUsed: false,
                   periodLength: 1,
                   periods: 4,
                   periodsLeft: 4
               },
               {
                   domain: "gmail.com",
                   periodBeingUsed: false,
                   periodLength: 1,
                   periods: 5,
                   periodsLeft: 2
               },
               {
                   domain: "twitter.com",
                   periodBeingUsed: false,
                   periodLength: 1,
                   periods: 4,
                   periodsLeft: 1
               },
           ]
        }
      }
    }

    beforeEach(module('checkless'));

    beforeEach(inject(function($rootScope, $controller) {
        this.scope = $rootScope.$new();
        $controller('Options', {
          $scope: this.scope,
          storage: storage
        });
    }));

    it('should return current version', inject(function(version) {
        expect(version).toEqual('0.1');
      }));

   // var $scope = null;
   //   var ctrl = null;

   //   /* A mocked version of our service, someService
   //    * we're mocking this so we have total control and we're
   //    * testing this in isolation from any calls it might
   //    * be making.
   //    */



   //  /* IMPORTANT!
   //     * this is where we're setting up the $scope and
   //     * calling the controller function on it, injecting
   //     * all the important bits, like our mockService */
   //    beforeEach(inject(function($rootScope, $controller) {
   //      //create a scope object for us to use.
   //      $scope = $rootScope.$new();

   //      //now run that scope through the controller function,
   //      //injecting any services or other injectables we need.
   //      ctrl = $controller('MainCtrl', {
   //        $scope: $scope,
   //        someService: storage
   //      });
   //    }));

   //    it('should start with foo and bar populated', function() {

   //      //just assert. $scope was set up in beforeEach() (above)
   //      expect($scope.entries[0].domain).toEqual('faceghbook.com');
   //    });

});