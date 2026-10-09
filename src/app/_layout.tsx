import React from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from '../db/database';
import { colors } from '../components/ui';
export default function RootLayout(){return <SQLiteProvider databaseName="itcertprep.db" onInit={initializeDatabase}><Stack screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.ink,headerTitleStyle:{fontWeight:'700'},contentStyle:{backgroundColor:colors.bg},headerShadowVisible:false}}><Stack.Screen name="index" options={{title:'ITCertPrep'}}/><Stack.Screen name="category/[categoryId]" options={{title:'Topics'}}/><Stack.Screen name="topic/[topicId]" options={{title:'Sections'}}/><Stack.Screen name="quiz" options={{title:'Practice'}}/><Stack.Screen name="results" options={{title:'Your results'}}/></Stack></SQLiteProvider>}
