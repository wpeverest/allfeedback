module.exports = {
	__:       ( str ) => str,
	_n:       ( single, plural, n ) => ( n === 1 ? single : plural ),
	_x:       ( str ) => str,
	sprintf:  ( fmt, ...args ) => args.reduce( ( s, a ) => s.replace( /%s/, a ), fmt ),
};
