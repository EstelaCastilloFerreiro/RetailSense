"""
Prediction Module
Handles loading models and generating forecasts for new seasons
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
import logging
from .training import load_model, mean_absolute_percentage_error
from .preprocessing import extract_season, parse_dates, clean_data, build_features
from sklearn.metrics import mean_absolute_error, mean_squared_error

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def detect_latest_season(df: pd.DataFrame) -> Dict:
    """
    Detect the latest season in the dataset
    
    Args:
        df: DataFrame with season information
        
    Returns:
        Dict with latest season info
    """
    df_seasons = df[df['season_type'].notna()]
    
    if len(df_seasons) == 0:
        return None
    
    latest = df_seasons.loc[df_seasons['season_year'].idxmax()]
    
    return {
        'season_type': latest['season_type'],
        'season_year': int(latest['season_year']),
        'season_label': f"{latest['season_type']}{str(latest['season_year'])[-2:]}"
    }


def generate_forecast(df: pd.DataFrame, 
                     target_season_choice: str,
                     model_dir: str = 'forecasting_engine/models') -> Dict:
    """
    Generate forecast for next PV or OI season
    
    Args:
        df: Preprocessed DataFrame with historical data
        target_season_choice: 'next_PV' or 'next_OI'
        model_dir: Directory containing trained models
        
    Returns:
        Dict with predictions and metrics
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"GENERATING FORECAST: {target_season_choice}")
    logger.info(f"{'='*60}\n")
    
    # Detect latest season
    latest = detect_latest_season(df)
    if not latest:
        raise ValueError("No valid seasons found in data")
    
    logger.info(f"Latest season detected: {latest['season_label']}")
    
    # Determine target season
    if target_season_choice == 'next_PV':
        target_season_type = 'PV'
        target_season_year = latest['season_year'] + 1
    elif target_season_choice == 'next_OI':
        target_season_type = 'OI'
        target_season_year = latest['season_year'] + 1
    else:
        raise ValueError(f"Invalid target_season_choice: {target_season_choice}")
    
    target_season_label = f"{target_season_type}{str(target_season_year)[-2:]}"
    logger.info(f"Target season: {target_season_label} ({target_season_year})")
    
    # Load model for target season type
    try:
        model = load_model(target_season_type, model_dir)
        logger.info(f"Model loaded successfully for {target_season_type}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
    
    # Build features for prediction
    # We'll use the same historical data structure but set season_year to target
    df_pred = df[df['season_type'] == target_season_type].copy()
    
    if len(df_pred) == 0:
        raise ValueError(f"No historical data found for season type {target_season_type}")
    
    # Update season_year to target year for prediction
    df_pred['season_year'] = target_season_year
    
    logger.info(f"Preparing {len(df_pred)} SKUs for prediction")
    
    # Extract features
    X_pred, _ = build_features(df_pred, target_season_type)
    
    # Make predictions
    y_pred = model.predict(X_pred)
    y_pred = np.maximum(0, y_pred)  # Ensure non-negative
    
    # Add predictions to dataframe
    df_pred['Cantidad_Predicha'] = y_pred
    
    # Calculate coverage
    valid_predictions = (y_pred > 0).sum()
    coverage = (valid_predictions / len(y_pred)) * 100
    
    logger.info(f"Predictions generated: {valid_predictions}/{len(y_pred)} ({coverage:.1f}% coverage)")
    logger.info(f"Mean predicted quantity: {y_pred.mean():.1f}")
    logger.info(f"Total predicted units: {y_pred.sum():.0f}")
    
    # Select relevant columns for output
    # Use tiered fallback for section/family grouping
    # Only accept columns with multiple distinct values for meaningful aggregation
    section_candidates = ['Familia', 'Línea Producto', 'Nombre TPV']
    section_column = None
    for candidate in section_candidates:
        if candidate in df_pred.columns:
            num_distinct = df_pred[candidate].nunique(dropna=True)
            if num_distinct > 1:
                section_column = candidate
                logger.info(f"Using '{candidate}' as SECCION for Plan de Compras grouping ({num_distinct} distinct values)")
                break
            else:
                logger.debug(f"Skipping '{candidate}': only {num_distinct} distinct value(s)")
    
    if section_column is None:
        # Fallback to creating a generic section
        df_pred['SECCION'] = 'Producto'
        logger.warning("No suitable multi-value section column found, using generic 'Producto' (will result in single-row Plan de Compras)")
    
    output_columns = [
        section_column if section_column else 'SECCION',
        'Artículo', 'Modelo Artículo', 'Color', 'Talla',
        'Cantidad_Predicha', 'Precio Coste', 'P.V.P.', 'Tema'
    ]
    
    available_columns = [col for col in output_columns if col in df_pred.columns]
    df_output = df_pred[available_columns].copy()
    
    # Rename selected column to SECCION
    if section_column and section_column in df_output.columns:
        df_output = df_output.rename(columns={section_column: 'SECCION'})
    
    result = {
        'season_label': target_season_label,
        'season_type': target_season_type,
        'season_year': target_season_year,
        'predictions_df': df_output,
        'coverage': coverage,
        'total_skus': len(df_output),
        'total_predicted_units': float(y_pred.sum())
    }
    
    logger.info(f"\n{'='*60}")
    logger.info(f"FORECAST COMPLETE: {target_season_label}")
    logger.info(f"{'='*60}\n")
    
    return result
