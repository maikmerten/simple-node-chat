// Credentials from the free LDAP test server by forumsys
// More info at: http://www.forumsys.com/tutorials/integration-how-to/ldap/online-ldap-test-server/

// password: "password"
// users: riemann, gauss

let ldapconfig = {
    server: {
        url: 'ldap://ldap.forumsys.com:389',
        bindDn: 'cn=read-only-admin,dc=example,dc=com',
        bindCredentials: 'password',
        searchBase: 'dc=example,dc=com',
        searchFilter: '(uid={{username}})'
    }
};


let config = {
    ldapconfig: ldapconfig,
    showIP: false
};


module.exports = config;


