/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: 'jest-environment-jsdom',
	testMatch: [ '**/tests/js/**/*.test.{ts,tsx}' ],
	transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
	setupFilesAfterEnv: [ '<rootDir>/tests/js/setup.ts' ],
	moduleNameMapper: {
		'^@/(.*)$':            '<rootDir>/resources/scripts/$1',
		'^@components/(.*)$':  '<rootDir>/resources/scripts/components/$1',
		'^@hooks/(.*)$':       '<rootDir>/resources/scripts/hooks/$1',
		'^@lib/(.*)$':         '<rootDir>/resources/scripts/lib/$1',
		'\\.(css|pcss|scss)$': '<rootDir>/tests/js/__mocks__/fileMock.js',
		'\\.(svg|png|jpg)$':   '<rootDir>/tests/js/__mocks__/fileMock.js',
		'^@wordpress/i18n$':   '<rootDir>/tests/js/__mocks__/wordpress-i18n.js',
	},
};
