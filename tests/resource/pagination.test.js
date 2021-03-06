'use strict';

var request = require('request'),
    async = require('async'),
    expect = require('chai').expect,
    _ = require('lodash'),
    rest = require('../../lib'),
    test = require('../support');

describe('Resource(pagination)', function() {
  before(function() {
    test.models.User = test.db.define('users', {
      id: { type: test.Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      username: {
        type: test.Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: test.Sequelize.STRING,
        unique: { msg: 'must be unique' },
        validate: { isEmail: true }
      }
    }, {
      underscored: true,
      timestamps: false
    });
  });

  [
    {
      name: 'with default pagination',
      configuration: {}
    },
    {
      name: 'without pagination',
      configuration: {
        pagination: false
      }
    }
  ].forEach(function(suite) {

    describe('list ' + suite.name, function() {

      before(function(done) {
        test.initializeDatabase(function() {
          test.initializeServer(function() {
            rest.initialize({
              app: test.app,
              sequelize: test.Sequelize
            });

            rest.resource(_.extend(suite.configuration, {
              model: test.models.User,
              endpoints: ['/users', '/users/:id']
            }));

            test.userlist = [
              { username: 'arthur', email: 'arthur@gmail.com' },
              { username: 'james', email: 'james@gmail.com' },
              { username: 'henry', email: 'henry@gmail.com' },
              { username: 'william', email: 'william@gmail.com' },
              { username: 'edward', email: 'edward@gmail.com' },
              { username: 'arthur', email: 'aaaaarthur@gmail.com' }
            ];

            async.each(test.userlist, function(data, callback) {
              request.post({
                url: test.baseUrl + '/users',
                json: data
              }, function(error, response, body) {
                expect(response).to.not.be.null;
                expect(response.statusCode).to.equal(201);
                expect(response.headers.location).to.match(/\/users\/\d+/);
                callback();
              });
            }, done);
          });
        });
      });

      after(function(done) {
        test.clearDatabase(function() {
          test.server.close(done);
        });
      });

      it('should list records with no criteria', function(done) {
        request.get({ url: test.baseUrl + '/users' }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var records = JSON.parse(body).map(function(r) { delete r.id; return r; });
          expect(records).to.eql(test.userlist);

          if (!_.has(suite.configuration, 'pagination') || !!suite.configuration.pagination)
            expect(response.headers['content-range']).to.equal('items 0-5/6');
          else
            expect(response.headers['content-range']).to.not.exist;

          done();
        });
      });

    });

  });

});
