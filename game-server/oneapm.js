/**
 * OneAPM agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['kod'],
  /**
   * Your OneAPM license key.
   */
  license_key : 'UlcLVhRaFda2elpcHF1FVF84c6QcUVRQB0g0030IAU4HABwB880cAQkNHVNQTANT',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to OneAPM when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'trace'
  },
  transaction_events: {
        enabled: true
  }
};
