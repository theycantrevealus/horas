describe('Login Page', () => {
    it('State should be', () => {
        cy.visit('/')
        cy.window().should('have.property', '__store__')
        const getStore = () => cy.window().its('__store__')
        getStore().its('state').its('loading').should('equal', 0)
        const credentialToken = getStore().its('state').its('credential').its('token')
        credentialToken.should('equal', null)
    })

    it('Visits the app root url', () => {
        const getStore = () => cy.window().its('__store__')
        const credentialToken = getStore().its('state').its('credential').its('token')
        credentialToken.should('equal', null)
        cy.contains('h1', 'Login')
        cy.get('button#submitButton').should('be.disabled')
        cy.get('input#loginEmail').type('takashitanaka@tnsol.com')
        cy.get('input#loginPassword').type('123456')
        cy.get('button#submitButton').should('be.enabled')
        cy.get('button#submitButton').click()
        cy.url().should("include", "dashboard")
    })
})