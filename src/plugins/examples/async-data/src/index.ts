/**
 * Async Data Plugin for Fleet Chat
 *
 * Demonstrates async data fetching, loading states, and error handling
 */

import {
  List,
  ListSection,
  Detail,
  ActionPanel,
  Action,
  OpenInBrowserAction,
  showToast,
  showHUD,
  CopyToClipboardAction,
  Cache,
} from '@fleet-chat/core-api';
import { useState, useEffect, usePromise } from '@fleet-chat/core-api';

// ============================================================================
// Interfaces
// ============================================================================

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

interface JokeResponse {
  id: string;
  type: string;
  setup: string;
  punchline: string;
}

// ============================================================================
// GitHub Search Command
// ============================================================================

export default function Command() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

  const fetchRepos = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setRepos([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=10&sort=stars`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      setRepos(data.items || []);
    } catch (error) {
      showToast({
        title: "Error fetching repositories",
        message: error instanceof Error ? error.message : String(error),
        style: "failure"
      });
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch with debounce when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepos(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <List
      searchBarPlaceholder="Search GitHub repositories..."
      onSearchTextChange={(text) => setQuery(text)}
      isShowingDetail={false}
    >
      {isLoading && (
        <ListSection title="Loading...">
          <List.Item
            title="Searching GitHub..."
            subtitle="Please wait"
            icon="⏳"
          />
        </ListSection>
      )}

      {!isLoading && query && repos.length === 0 && (
        <ListSection title="No Results">
          <List.Item
            title="No repositories found"
            subtitle={`No results for "${query}"`}
            icon="🔍"
          />
        </ListSection>
      )}

      {!isLoading && repos.length > 0 && (
        <ListSection title={`Results (${repos.length})`}>
          {repos.map((repo) => (
            <List.Item
              key={repo.id}
              title={repo.full_name}
              subtitle={repo.description || 'No description'}
              icon={repo.language ? getLanguageIcon(repo.language) : '📦'}
              accessories={[
                { text: `${formatNumber(repo.stargazers_count)} ⭐` },
                { text: `${repo.language || 'Unknown'}` }
              ]}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction
                    title="Open on GitHub"
                    url={repo.html_url}
                  />
                  <CopyToClipboardAction
                    title="Copy Repository Name"
                    content={repo.full_name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Show Details"
                    onAction={() => {
                      showToast({
                        title: repo.full_name,
                        message: `${formatNumber(repo.forks_count)} forks • ${formatNumber(repo.stargazers_count)} stars`,
                        style: "info"
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </ListSection>
      )}

      {!isLoading && !query && (
        <ListSection title="Popular Searches">
          <List.Action
            title="Tauri"
            subtitle="Cross-platform desktop applications"
            icon="🦀"
            onAction={() => setQuery('tauri')}
          />
          <List.Action
            title="Lit"
            subtitle="Lightweight web components"
            icon="🔥"
            onAction={() => setQuery('lit web components')}
          />
          <List.Action
            title="Rust"
            subtitle="Systems programming language"
            icon="🦀"
            onAction={() => setQuery('rust')}
          />
        </ListSection>
      )}
    </List>
  );
}

// ============================================================================
// Weather Command
// ============================================================================

export function weather() {
  const [city, setCity] = useState('San Francisco');
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (cityName: string) => {
    if (!cityName.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setWeather(null);

    try {
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location');
      }

      const geoData = await response.json();
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
      }

      const { latitude, longitude, name } = geoData.results[0];

      // Fetch weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather');
      }

      const weatherData = await weatherResponse.json();
      setWeather({
        name,
        ...weatherData.current
      });

      showHUD(`Weather updated for ${name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      showToast({
        title: "Weather Error",
        message: errorMessage,
        style: "failure"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount with default city
  useEffect(() => {
    fetchWeather(city);
  }, []);

  return (
    <List
      searchBarPlaceholder="Enter city name..."
      onSearchTextChange={(text) => {
        if (text && text.length > 2) {
          fetchWeather(text);
        }
      }}
    >
      {isLoading && (
        <List.Item
          title="Loading weather..."
          subtitle="Please wait"
          icon="⏳"
        />
      )}

      {error && (
        <List.Item
          title="Error"
          subtitle={error}
          icon="❌"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => fetchWeather(city)}
              />
            </ActionPanel>
          }
        />
      )}

      {weather && !isLoading && !error && (
        <ListSection title={weather.name}>
          <List.Item
            title={`${Math.round(weather.main.temp)}°C`}
            subtitle={`Feels like ${Math.round(weather.main.feels_like)}°C • ${weather.weather[0]?.description || ''}`}
            icon={getWeatherIcon(weather.weather[0]?.main)}
            accessories={[
              { text: `Humidity: ${weather.main.humidity}%` },
              { text: `Wind: ${Math.round(weather.wind.speed)} km/h` }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => fetchWeather(city)}
                />
                <Action
                  title="Show Details"
                  onAction={() => {
                    showToast({
                      title: weather.name,
                      message: `Min: ${Math.round(weather.main.temp_min)}°C • Max: ${Math.round(weather.main.temp_max)}°C`,
                      style: "info"
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </ListSection>
      )}

      <ListSection title="Popular Cities">
        <List.Action
          title="Tokyo"
          subtitle="Japan"
          icon="🗼"
          onAction={() => {
            setCity('Tokyo');
            fetchWeather('Tokyo');
          }}
        />
        <List.Action
          title="New York"
          subtitle="USA"
          icon="🗽"
          onAction={() => {
            setCity('New York');
            fetchWeather('New York');
          }}
        />
        <List.Action
          title="London"
          subtitle="UK"
          icon="🇬🇧"
          onAction={() => {
            setCity('London');
            fetchWeather('London');
          }}
        />
        <List.Action
          title="Paris"
          subtitle="France"
          icon="🇫🇷"
          onAction={() => {
            setCity('Paris');
            fetchWeather('Paris');
          }}
        />
      </ListSection>
    </List>
  );
}

// ============================================================================
// Jokes Command
// ============================================================================

export function jokes() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentJoke, setCurrentJoke] = useState<JokeResponse | null>(null);
  const [jokeHistory, setJokeHistory] = useState<JokeResponse[]>([]);
  const [jokeType, setJokeType] = useState<'general' | 'programming' | 'knock-knock'>('general');

  const fetchJoke = async () => {
    setIsLoading(true);
    try {
      let url = 'https://official-joke-api.appspot.com/jokes/random';
      if (jokeType === 'programming') {
        url += '?type=programming';
      } else if (jokeType === 'knock-knock') {
        url += '?type=knock-knock';
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch joke');
      }

      const joke: JokeResponse = await response.json();
      setCurrentJoke(joke);
      setJokeHistory(prev => [joke, ...prev].slice(0, 9)); // Keep last 10
    } catch (error) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
        style: "failure"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List>
      {currentJoke && (
        <ListSection title="Current Joke">
          <List.Item
            title={jokeType === 'knock-knock' ? joke.setup : currentJoke.setup || currentJoke.type}
            subtitle={currentJoke.punchline || ''}
            icon="😄"
            actions={
              <ActionPanel>
                <CopyToClipboardAction
                  title="Copy Joke"
                  content={`${currentJoke.setup} ${currentJoke.punchline}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Share Joke"
                  onAction={() => {
                    showToast({
                      title: "Joke Shared",
                      message: "Copied to clipboard!",
                      style: "success"
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </ListSection>
      )}

      <ListSection title="Actions">
        <List.Action
          title="New Joke"
          subtitle="Get a random joke"
          icon="🎲"
          onAction={fetchJoke}
        />
      </ListSection>

      <ListSection title="Joke Type">
        {(['general', 'programming', 'knock-knock'] as const).map(type => (
          <List.Action
            key={type}
            title={type.charAt(0).toUpperCase() + type.slice(1)}
            subtitle={jokeType === type ? 'Current selection' : 'Switch to this type'}
            icon={type === 'programming' ? '💻' : type === 'knock-knock' ? '🚪' : '😄'}
            onAction={() => {
              setJokeType(type);
              fetchJoke();
            }}
          />
        ))}
      </ListSection>

      {jokeHistory.length > 0 && (
        <ListSection title={`History (${jokeHistory.length})`}>
          {jokeHistory.map((joke, index) => (
            <List.Item
              key={joke.id}
              title={joke.setup || joke.type}
              subtitle={joke.punchline}
              icon="📝"
              actions={
                <ActionPanel>
                  <Action
                    title="Show Again"
                    onAction={() => setCurrentJoke(joke)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </ListSection>
      )}

      {isLoading && (
        <List.Item
          title="Loading..."
          subtitle="Fetching a joke for you"
          icon="⏳"
        />
      )}
    </List>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function getLanguageIcon(language: string): string {
  const icons: Record<string, string> = {
    'TypeScript': '📘',
    'JavaScript': '📜',
    'Python': '🐍',
    'Rust': '🦀',
    'Go': '🐹',
    'Java': '☕',
    'C++': '🔷',
    'Ruby': '💎',
    'PHP': '🐘',
    'Swift': '🍎',
    'Kotlin': '🤖',
    'Dart': '🎯',
    'Shell': '🐚',
  };
  return icons[language] || '📁';
}

function getWeatherIcon(code?: string): string {
  const iconMap: Record<string, string> = {
    '01': '☀️', // Clear
    '02': '⛅', // Partly cloudy
    '03': '☁️', // Overcast
    '09': '🌧️', // Rain
    '11': '⛈️', // Thunderstorm
    '13': '🌨️', // Snow
    '50': '🌫️', // Mist
  };
  return iconMap[code?.substring(0, 2)] || '🌤️';
}
