/**
 * CYBER CUBE TIMER - Utility functions
 * Idempotent global attach to avoid duplicate-declare errors
 */
(function(){
    if (!window.TimeUtil) {
        window.TimeUtil = {
            formatTime(ms) {
                return (ms / 1000).toFixed(3);
            },
            isDNF(ms) {
                return ms === Infinity || isNaN(ms) || ms < 0;
            }
        };
    }
})();
