(function () {
  'use strict';
  angular
      .module('hw8',['ngMaterial', 'ngAnimate', 'ui.router','ui.toggle'])
      .controller('LandingPage', AutoComplete)
      .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('favorite', {
            url: '/',
            templateUrl: '../views/favorite-list.html',
            controller: 'favoriteController',
            resolve: {
              getFavorites: function($q, $http) {
                var deferred = $q.defer();
                var keys = Object.keys(localStorage);
                var favorites = [];
                var est = moment().tz("US/Eastern");
                if(est.hour() >= 4 && est.hour() < 16) {
                  // console.log('updating favorites');
                  angular.forEach(keys, function(key) {
                    var stock = angular.fromJson(localStorage[key]);
                    if(stock.symbol) {
                      var config = {
                        params: {
                          stockSymbol: stock.symbol,
                          outputsize:'compact'
                        }
                      };
                      $http.get('/stock', config)
                        .then(function(response){
                          if(response.status == 200) {
                            var id = stock.id;
                            var obj = response.data;
                            obj.last_price = {
                              value: obj.last_price,
                              text: obj.last_price.toFixed(2)
                            };
                            obj.change = {
                              value: obj.change,
                              text: obj.change.toFixed(2)
                            };
                            obj.change_percent = {
                              value: obj.change_percent,
                              text: obj.change_percent.toFixed(2)
                            };
                            obj.volume = {
                              value: obj.volume,
                              text: obj.volume.toLocaleString()
                            };
                            obj["id"] = id;
                            localStorage.setItem(obj.symbol, angular.toJson(obj));
                            favorites.push(angular.fromJson(localStorage[key]));
                            deferred.resolve(favorites);
                          }

                        })
                        .catch(function(error) {
                          console.log(error);
                          favorites.push(angular.fromJson(localStorage[key]));
                          deferred.resolve(favorites);
                        });
                    }
                  });
                  return deferred.promise;
                } else {
                  angular.forEach(keys, function(key) {
                    if(key != 'id') {
                      favorites.push(angular.fromJson(localStorage[key]));
                      deferred.resolve(favorites);
                    }
                  });
                  return deferred.promise;
                }
              }
            }
          })
          .state('stock', {
            url: '/stock',
            templateUrl: '../views/stock-details.html',
            controller: 'stockDetailsController',
            params: {
              validRoute: null
            }
          });

        $urlRouterProvider.otherwise('/');
      }])
      .controller('favoriteController', function($scope, $rootScope, $state, $http, $q, formatResponseService, currentStockData, getFavorites) {
        // $('#result-area-header-favorite').css("display", "flex");
        // $('#result-area-header-stock').hide();

        $scope.orderKey = '';
        $scope.favorites = getFavorites;
        $scope.stockKeys = {
            keys: [{
                value: "id",
                text: "Default"
              }, {
                value: "symbol",
                text: "Symbol"
              }, {
                value: "last_price.value",
                text: "Stock Price"
              }, {
                value: "change.value",
                text: "Change (Change Percent)"
              }, {
                value: "volume.value",
                text: "Volume"
              }
            ],
            selectedKey: {
              value: "id",
              text: "Default"
            },
            possibleOrders: [{
              value: "Ascending",
              reverse: false
            }, {
              value: "Descending",
              reverse: true
            }],
            selectedOrder: {
              value: "Ascending",
              reverse: false
            }
        };
        $scope.autoRefresh = false;
        $rootScope.newParentRequestMade = false;
        $scope.stockData = currentStockData.getStockData();

        $scope.defaultSelected = function() {
          if($scope.stockKeys.selectedKey.value == "id") {
            $scope.stockKeys.selectedOrder = {
              value: "Ascending",
              reverse: false
            };
          }
        };

        $scope.deleteFavorite = function(item) {
          for(var i in $scope.favorites) {
            if($scope.favorites[i].symbol == item.symbol) {
              console.log($scope.favorites[i]);
              console.log($scope.favorites[i].symbol);
              item = angular.fromJson(localStorage.getItem($scope.favorites[i].symbol));
              if(item) {
                localStorage.removeItem($scope.favorites[i].symbol);
                $scope.favorites[i]["symbolExistsInLocalStorage"] = false;
              }
              // currentStockData.setStockData($scope.favorites[i]);
              localStorage.removeItem(item.symbol);
              $scope.favorites.splice(i, 1);
              return;
            }
          }
        };

        $scope.updateFavorites = function() {
          console.log('updating favorites');
          $scope.favorites = getFavorites;
        };

        $scope.goToStockDetails = function() {
          if($scope.stockData) {
            $state.go('stock', {
              validRoute: true
            });
          }
        };

        $scope.getStockData = function(symbol) {
          console.log('getting stock data from favorite list for ' + symbol);
          console.log("Getting stock data");

          $state.go('stock', {
            validRoute: true
          });

          $rootScope.newParentRequestMade = true;
          console.log('making new request');

          var config = {
            params: {
              stockSymbol: symbol,
              outputsize:'full'
            }
          };
          $http.get('/stock', config)
            .then(function(response){
              if(response.status == 200) {

                formatResponseService.formatResponse(response.data);
                $scope.stockData = response.data;
                currentStockData.setStockData($scope.stockData);
                var obj = $scope.stockData;
                obj.last_price = {
                  value: parseFloat(obj.last_price),
                  text: parseFloat(obj.last_price).toFixed(2)
                };
                obj.change = {
                  value: parseFloat(obj.change),
                  text: parseFloat(obj.change).toFixed(2)
                };
                obj.change_percent = {
                  value: parseFloat(obj.change_percent),
                  text: parseFloat(obj.change_percent).toFixed(2)
                };
                obj.volume = {
                  value: parseInt(obj.volume.replace(/,/g,'')),
                  text: obj.volume
                };
                currentStockData.setStockData($scope.stockData);
                $rootScope.newParentRequestMade = false;
                var favorite = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
                if(favorite) {
                  $scope.stockData["symbolExistsInLocalStorage"] = true;
                } else {
                  $scope.stockData["symbolExistsInLocalStorage"] = false;
                }
                console.log("Data succesfully received");
              } else {
                console.log("Data not succesfully received");
                console.log(response);
                // self.stockData = null;
              }
            })
            .catch(function(error) {
              // self.stockData = null;
              self.newRequestMade = false;
              console.log('error receiving data from node');
              console.log(error);
            });
        }
      })
      .controller('stockDetailsController', function($scope, $rootScope, $state, $stateParams, formatResponseService, currentStockData) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $scope.newRequestMade = false;

        $scope.stockData = currentStockData.getStockData();
        if(!$scope.stockData) {
          $scope.newRequestMade = true;
        }

        $scope.$watch(function() {
          return $rootScope.newParentRequestMade;
        }, function() {
          $scope.newRequestMade = $rootScope.newParentRequestMade;
          $scope.stockData = currentStockData.getStockData();
        }, true);

        $scope.$on('getStockData', function(event, args) {
          formatResponseService.formatResponse(args);
          $scope.stockData = args;
          currentStockData.setStockData($scope.stockData);
          var obj = $scope.stockData;
          obj.last_price = {
            value: parseFloat(obj.last_price),
            text: parseFloat(obj.last_price).toFixed(2)
          };
          obj.change = {
            value: parseFloat(obj.change),
            text: parseFloat(obj.change).toFixed(2)
          };
          obj.change_percent = {
            value: parseFloat(obj.change_percent),
            text: parseFloat(obj.change_percent).toFixed(2)
          };
          obj.volume = {
            value: parseInt(obj.volume.replace(/,/g,'')),
            text: obj.volume
          };
          currentStockData.setStockData($scope.stockData);
          $scope.newRequestMade = false;
          var favorite = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
          if(favorite) {
            $scope.stockData["symbolExistsInLocalStorage"] = true;
          } else {
            $scope.stockData["symbolExistsInLocalStorage"] = false;
          }
        });

        $scope.toggleFavorite = function() {
          var item = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
          if(item) {
            localStorage.removeItem($scope.stockData.symbol);
            $scope.stockData["symbolExistsInLocalStorage"] = false;
          } else {
            var obj = Object.assign({}, $scope.stockData);
            var id = parseInt(localStorage.getItem("id"));
            if(!id) {
              localStorage.setItem("id", 0);
              id = 0;
            }
            obj["id"] = id+1;
            console.log($scope.stockData);
            localStorage.setItem($scope.stockData.symbol, angular.toJson(obj));
            localStorage.setItem("id", id+1);
            $scope.stockData["symbolExistsInLocalStorage"] = true;
          }
          currentStockData.setStockData($scope.stockData);
        };
        // console.log(localStorage);
      })
      .factory('formatResponseService', function() {
        return {
          formatResponse: function(stockData) {
            stockData.timestamp = moment.tz(stockData.timestamp, "US/Eastern").format("YYYY-MM-DD HH:mm:ss zz");
            stockData.change = parseFloat(stockData.change).toFixed(2);
            stockData.change_percent = parseFloat(stockData.change_percent).toFixed(2);
            stockData.close = parseFloat(stockData.close).toFixed(2);
            stockData.high = parseFloat(stockData.high).toFixed(2);
            stockData.last_price = parseFloat(stockData.last_price).toFixed(2);
            stockData.low = parseFloat(stockData.low).toFixed(2);
            stockData.open = parseFloat(stockData.open).toFixed(2);
            stockData.prev_close = parseFloat(stockData.prev_close).toFixed(2);
            stockData.volume = parseInt(stockData.volume).toLocaleString();
          }
        };
      })
      .factory('currentStockData', function() {
        var stock = null;
        return {
          getStockData: function() {
            return stock;
          },
          setStockData: function(stockData) {
            stock = stockData;
          }
        };
      });

  function AutoComplete ($http, $q, $sce, $scope, $rootScope, $state, $timeout, currentStockData) {
    var self = this;

    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange   = searchTextChange;
    self.getStockQuote = getStockQuote;
    self.clear = clear;
    self.error = false;
    self.selectedItem = null;
    self.stockDataExists = false;
    self.stockData = null;
    $rootScope.newParentRequestMade = false;

    function querySearch (query) {
      var deferred = $q.defer();

      var config = {
        params: {
          queryText: query
        }
      };
      $http.get('/autocomplete', config)
        .then(function(response) {
          deferred.resolve(response.data);
        })
        .catch(function(error) {
        });

      return deferred.promise;
    }

    function searchTextChange(text) {
      var letterNumber = /^[0-9a-zA-Z ]+$/;

      if(text.match(letterNumber)) {
        self.error = false;
      } else {
        self.error = true;
      }
      // $log.info('Text changed to ' + text);
    }

    function selectedItemChange(item) {
      // $log.info('Item changed to ' + JSON.stringify(item));
      // passStockSymbolService.setStockSymbol(self.payload[0]);
    }

    function clear() {
      self.selectedItem = null;
      self.searchText = "";
    }

    function getStockQuote() {
      console.log("Getting stock data");

      $state.go('stock', {
        validRoute: true
      });

      self.stockData = currentStockData.getStockData();
      if(!self.stockData || self.stockData.symbol != self.selectedItem.Symbol) {
        console.log('making new request');
        $rootScope.newParentRequestMade = true;

        var config = {
          params: {
            stockSymbol: self.selectedItem.Symbol,
            outputsize:'full'
          }
        };
        $http.get('/stock', config)
          .then(function(response){
            if(response.status == 200) {

              self.stockData = response.data;
              console.log(self.stockData);
              currentStockData.setStockData(self.stockData);

              $scope.broadcast = function() {
                $rootScope.$broadcast('getStockData', self.stockData);
              };
              $scope.$evalAsync( function() {
                $scope.broadcast();
              });

              $rootScope.newParentRequestMade = false;

              console.log("Data succesfully received");
            } else {
              console.log("Data not succesfully received");
              console.log(response);
              // self.stockData = null;
            }
          })
          .catch(function(error) {
            // self.stockData = null;
            self.newRequestMade = false;
            console.log('error receiving data from node');
            console.log(error);
          });
      } else {
        console.log("stock data already on display");
      }

    }
  }

})(this);
