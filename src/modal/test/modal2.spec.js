ddescribe('$modal', function () {
  var $rootScope, $document, $compile, $templateCache, $timeout, $q;
  var $modal, $modalProvider;

  beforeEach(module('ui.bootstrap.modal2'));
  beforeEach(module('template/modal/backdrop.html'));
  beforeEach(module('template/modal/window.html'));
  beforeEach(module(function(_$modalProvider_){
    $modalProvider = _$modalProvider_;
  }));

  beforeEach(inject(function (_$rootScope_, _$document_, _$compile_, _$templateCache_, _$timeout_, _$q_, _$modal_) {
    $rootScope = _$rootScope_;
    $document = _$document_;
    $compile = _$compile_;
    $templateCache = _$templateCache_;
    $timeout = _$timeout_;
    $q = _$q_;
    $modal = _$modal_;
  }));

  beforeEach(inject(function ($rootScope) {
    this.addMatchers({

      toBeResolvedWith: function(value) {
        var resolved;
        this.message = function() {
          return "Expected '" + angular.mock.dump(this.actual) + "' to be resolved with '" + value + "'.";
        };
        this.actual.then(function(result){
          resolved = result;
        });
        $rootScope.$digest();

        return resolved === value;
      },

      toBeRejectedWith: function(value) {
        var rejected;
        this.message = function() {
          return "Expected '" + angular.mock.dump(this.actual) + "' to be rejected with '" + value + "'.";
        };
        this.actual.then(angular.noop, function(reason){
          rejected = reason;
        });
        $rootScope.$digest();

        return rejected === value;
      },

      toHaveModalOpenWithContent: function(content, selector) {

        var contentToCompare, modalDomEls = this.actual.find('body > div.modal.in');

        this.message = function() {
          return "Expected '" + angular.mock.dump(modalDomEls) + "' to be open with '" + content + "'.";
        };

        contentToCompare = selector ? modalDomEls.find(selector) : modalDomEls;
        return modalDomEls.css('display') === 'block' &&  contentToCompare.html() == content;
      },

      toHaveModalsOpen: function(noOfModals) {

        var modalDomEls = this.actual.find('body > div.modal.in');
        return modalDomEls.length === noOfModals;
      },

      toHaveBackdrop: function() {

        var backdropDomEls = this.actual.find('body > div.modal-backdrop');
        this.message = function() {
          return "Expected '" + angular.mock.dump(backdropDomEls) + "' to be a backdrop element'.";
        };

        return backdropDomEls.length === 1;
      }
    });
  }));

  afterEach(function () {
    var body = $document.find('body');
    body.find('div.modal').remove();
    body.find('div.modal-backdrop').remove();
  });

  function open(modalOptions) {
    var modal = $modal.open(modalOptions);
    $rootScope.$digest();
    return modal;
  }

  function close(modal, result) {
    modal.close(result);
    $rootScope.$digest();
  }

  function dismiss(modal, reason) {
    modal.dismiss(reason);
    $rootScope.$digest();
  }

  describe('basic scenarios with default options', function () {

    it('should open and dismiss a modal with a minimal set of options', function () {

      var modal = open({template: '<div>Content</div>'});

      expect($document).toHaveModalsOpen(1);
      expect($document).toHaveModalOpenWithContent('Content', 'div');
      expect($document).toHaveBackdrop();

      dismiss(modal, 'closing in test');

      expect($document).toHaveModalsOpen(0);
      expect($document).not.toHaveBackdrop();
    });

    it('should open a modal from templateUrl', function () {

      $templateCache.put('content.html', '<div>URL Content</div>');
      var modal = open({templateUrl: 'content.html'});

      expect($document).toHaveModalsOpen(1);
      expect($document).toHaveModalOpenWithContent('URL Content', 'div');
      expect($document).toHaveBackdrop();

      dismiss(modal, 'closing in test');

      expect($document).toHaveModalsOpen(0);
      expect($document).not.toHaveBackdrop();
    });

    it('should resolve returned promise on close', function () {
      var modal = open({template: '<div>Content</div>'});
      close(modal, 'closed ok');

      expect(modal.result).toBeResolvedWith('closed ok');
    });

    it('should reject returned promise on dismiss', function () {

      var modal = open({template: '<div>Content</div>'});
      dismiss(modal, 'esc');

      expect(modal.result).toBeRejectedWith('esc');
    });
  });

  describe('default options can be changed in a provider', function () {

    it('should allow overriding default options in a provider', function () {

      $modalProvider.options.backdrop = false;
      var modal = open({template: '<div>Content</div>'});

      expect($document).toHaveModalOpenWithContent('Content', 'div');
      expect($document).not.toHaveBackdrop();
    });
  });

  describe('option by option', function () {

    describe('template and templateUrl', function () {

      it('should throw an error if none of template and templateUrl are provided', function () {
        expect(function(){
          var modal = open({});
        }).toThrow(new Error('One of template or templateUrl options is required.'));
      });

      it('should not fail if a templateUrl contains leading / trailing white spaces', function () {

        $templateCache.put('whitespace.html', '  <div>Whitespaces</div>  ');
        open({templateUrl: 'whitespace.html'});
        expect($document).toHaveModalOpenWithContent('Whitespaces', 'div');
      });

    });

    describe('controllers', function () {

      it('should accept controllers and inject modal instances', function () {

        var TestCtrl = function($scope, $modalInstance) {
          $scope.fromCtrl = 'Content from ctrl';
          $scope.isModalInstance = angular.isObject($modalInstance) && angular.isFunction($modalInstance.close);
        };

        var modal = open({template: '<div>{{fromCtrl}} {{isModalInstance}}</div>', controller: TestCtrl});
        expect($document).toHaveModalOpenWithContent('Content from ctrl true', 'div');
      });

      xit('should expose controllers on DOM elements', function () {

        var TestCtrl = function($scope) {};
        var modal = open({template: '<div>test</div>', controller: TestCtrl});

        expect($document.find('body > div.modal.in').children().controller()).toEqual(TestCtrl);
      });

    });

    describe('resolve', function () {

      var ExposeCtrl = function($scope, value) {
        $scope.value = value;
      };

      function modalDefinition(template, resolve) {
        return {
          template: template,
          controller: ExposeCtrl,
          resolve: resolve
        };
      }

      it('should resolve simple values', function () {
        open(modalDefinition('<div>{{value}}</div>', {
          value: function () {
            return 'Content from resolve';
          }
        }));

        expect($document).toHaveModalOpenWithContent('Content from resolve', 'div');
      });

      it('should delay showing modal if one of the resolves is a promise', function () {

        open(modalDefinition('<div>{{value}}</div>', {
          value: function () {
            return $timeout(function(){ return 'Promise'; }, 100);
          }
        }));
        expect($document).toHaveModalsOpen(0);

        $timeout.flush();
        expect($document).toHaveModalOpenWithContent('Promise', 'div');
      });

      it('should not open dialog (and reject returned promise) if one of resolve fails', function () {

        var deferred = $q.defer();

        var modal = open(modalDefinition('<div>{{value}}</div>', {
          value: function () {
            return deferred.promise;
          }
        }));
        expect($document).toHaveModalsOpen(0);

        deferred.reject('error in test');
        $rootScope.$digest();

        expect($document).toHaveModalsOpen(0);
        expect(modal.result).toBeRejectedWith('error in test');
      });

      it('should support injection with minification-safe syntax in resolve functions', function () {

        open(modalDefinition('<div>{{value.id}}</div>', {
          value: ['$locale', function (e) {
            return e;
          }]
        }));

        expect($document).toHaveModalOpenWithContent('en-us', 'div');
      });

      //TODO: resolves with dependency injection - do we want to support them?
    });

    describe('scope', function () {

      it('should custom scope if provided', function () {
        var $scope = $rootScope.$new();
        $scope.fromScope = 'Content from custom scope';
        open({
          template: '<div>{{fromScope}}</div>',
          scope: $scope
        });
        expect($document).toHaveModalOpenWithContent('Content from custom scope', 'div');
      });
    });

    describe('backdrop', function () {

      it('should not have any backdrop element if backdrop set to false', function () {
        open({
          template: '<div>No backdrop</div>',
          backdrop: false
        });
        expect($document).toHaveModalOpenWithContent('No backdrop', 'div');
        expect($document).not.toHaveBackdrop();
      });

    });
  });

  //TODO: tests to write:
  //- global / local options
  //- fade
  //- backdrop
  //- multiple modals
  //- what about "isOpen"? Why do we need it?
  //- stack of modals where some of them got backdrop and other do not
  //- pressing esc where top of the backdrop can / can't be closed on ESC
  //- clicking on backdrop where top of the stack can / can't be closed
  //- this is modal so I need to prevent default (!)
  //fading => got no idea what is going on here, but I should fade in / out only when backdrop is needed / not needed
});