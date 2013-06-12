angular.module('ui.bootstrap.modal2', [])

/**
 * A helper directive for the $modal service. It creates a backdrop element
 * that can listen to clicks events and pass those events -
 * as function calls - to the $modal service
 */
  .directive('modalBackdrop', [function () {
    return {
      restrict: 'EA',
      scope: {},
      replace: true,
      templateUrl: 'template/modal/backdrop.html',
      link: function (scope, element, attrs) {
        //TODO: register click event handler if not static
        //remember to prevent default if keyboard is closing things
        //support animations: toggle fade in / out class - will need to learn about the $transition service
      }
    };
  }])

  //TODO: support fading
  .directive('modalWindow', function () {
    return {
      restrict: 'EA',
      scope: {},
      replace: true,
      transclude: true,
      templateUrl: 'template/modal/window.html'
    };
  })

  .factory('$modalStack', function () {

    var stack = [], $modalStack = {};

    $modalStack.open = function(modalOptions) {
      modalOptions = {
        content: '',
        backdrop: '',
        keyboard: true
      };
    };

    $modalStack.close = function(modalInstance) {
    };

    $modalStack.closeAll = function(modalInstance) {
    };

    return $modalStack;
  })

  .provider('$modal', function() {

    var defaultOptions = {
      backdrop: true, //can be also false or 'static'
      keyboard: true
    };

    return {
      options: defaultOptions,
      $get: ['$document', '$injector', '$compile', '$rootScope', '$q', '$http', '$templateCache', '$controller',
        function ($document, $injector, $compile, $rootScope, $q, $http, $templateCache, $controller) {

          function getTemplatePromise(options) {
            return options.template ? $q.when(options.template) :
              $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                return result.data;
              });
          }

          function getResolvePromises(resolves) {
            var promisesArr = [];

            angular.forEach(resolves, function (value, key) {
              if (angular.isFunction(value) || angular.isArray(value)) {
                promisesArr.push($q.when($injector.invoke(value)));
              }
            });

            return promisesArr;
          }

          var $modal = {};
          var body = $document.find('body').eq(0);

          $modal.open = function (modalOptions) {

            var modalDomEl, backdropDomEl;
            var modalScope = (modalOptions.scope || $rootScope).$new();
            var modalResultDeferred = $q.defer();

            function closeModalInstance() {
              modalDomEl.remove();
              if (modalOptions.backdrop) {
                backdropDomEl.remove();
              }
              modalScope.$destroy();
            }

            //merge / verify / clean up options
            modalOptions = angular.extend(defaultOptions, modalOptions);
            if (!modalOptions.template && !modalOptions.templateUrl) {
              throw new Error('One of template or templateUrl options is required.');
            }
            modalOptions.resolve = modalOptions.resolve || {};

            //prepare an instance of a modal to be injected into controllers and returned to a caller
            var modalInstance = {
              result: modalResultDeferred.promise,
              close: function (result) {
                closeModalInstance();
                modalResultDeferred.resolve(result);
              },
              dismiss: function (reason) {
                closeModalInstance();
                modalResultDeferred.reject(reason);
              }
            };

            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)))

              .then(function resolveSuccess(tplAndVars) {

                var tplContent = tplAndVars[0];
                var ctrlInstance, ctrlLocals = {};
                var resolveIter = 1;

                //TODO: how to signal that a window is being opened? And should I signal it here? Maybe only to the window template?

                //controllers
                if (modalOptions.controller) {
                  ctrlLocals.$scope = modalScope;
                  ctrlLocals.$modalInstance = modalInstance;
                  angular.forEach(modalOptions.resolve, function (value, key) {
                    ctrlLocals[key] = tplAndVars[resolveIter++];
                  });

                  ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
                }

                //modal DOM element
                modalDomEl = $compile(angular.element('<modal-window>').html(tplContent))(modalScope);
                body.append(modalDomEl);

                //backdrops
                if (modalOptions.backdrop) {
                  backdropDomEl = $compile(angular.element('<modal-backdrop>'))($rootScope);
                  body.append(backdropDomEl);
                }

                //TODO: close on ESC

              }, function resolveError(reason) {
                modalScope.$destroy();
                modalResultDeferred.reject(reason);
              });

            //TODO:
            //fading
            //location change
            //multiple modals with mixed backdrop / keyboard options
            //close on ESC
            //close on backdrop click

            return modalInstance;
          };

          return $modal;
        }]
    };
  });