import { useState, useEffect } from 'react';
import { channelService } from '../../services/channelService';
import { useAuth } from '../../context/AuthContext';
import { FiX } from 'react-icons/fi';

const ChannelModal = ({ channel, languages, categories, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    lang: 'hi',
    type: '',
    url: '',
    flussonic_token: '',
    flussonic_uri: '',
    flussonic_key: '',
    restream_count: 3,
    support_email: [],
    epgCheck: '',
  });
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        lang: channel.lang || 'hi',
        type: channel.type || '',
        url: channel.url || '',
        flussonic_token: channel.flussonic_token || '',
        flussonic_uri: channel.flussonic_uri || '',
        flussonic_key: channel.flussonic_key || '',
        restream_count: channel.restream_count || 3,
        support_email: channel.support_email || [],
        epgCheck: channel.epgCheck ? new Date(channel.epgCheck).toISOString().slice(0, 16) : '',
      });
    } else {
      // Set default author for new channels
      if (user?._id) {
        setFormData((prev) => ({ ...prev, author: user._id }));
      }
    }
  }, [channel, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        author: user?._id,
        epgCheck: formData.epgCheck ? new Date(formData.epgCheck).toISOString() : undefined,
      };

      if (channel) {
        await channelService.updateChannel(channel._id, submitData);
      } else {
        await channelService.createChannel(submitData);
      }
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Error saving channel');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    if (emailInput.trim()) {
      setFormData({
        ...formData,
        support_email: [...formData.support_email, emailInput.trim()],
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (index) => {
    setFormData({
      ...formData,
      support_email: formData.support_email.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {channel ? 'Edit Channel' : 'Create Channel'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Channel Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
              <select
                required
                value={formData.lang}
                onChange={(e) => setFormData({ ...formData, lang: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flussonic Token
              </label>
              <input
                type="text"
                value={formData.flussonic_token}
                onChange={(e) => setFormData({ ...formData, flussonic_token: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flussonic URI
              </label>
              <input
                type="text"
                value={formData.flussonic_uri}
                onChange={(e) => setFormData({ ...formData, flussonic_uri: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flussonic Key
              </label>
              <input
                type="text"
                value={formData.flussonic_key}
                onChange={(e) => setFormData({ ...formData, flussonic_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restream Count
              </label>
              <input
                type="number"
                min="1"
                value={formData.restream_count}
                onChange={(e) =>
                  setFormData({ ...formData, restream_count: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support Emails
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                placeholder="Enter email and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.support_email.map((email, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(index)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">EPG Check Date</label>
            <input
              type="datetime-local"
              value={formData.epgCheck}
              onChange={(e) => setFormData({ ...formData, epgCheck: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : channel ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelModal;

