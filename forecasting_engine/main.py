"""
Main orchestration script for ML forecasting
Handles training and prediction workflows
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict
from forecasting_engine.preprocessing import prepare_data_for_training, load_excel, extract_season, parse_dates, clean_data
from forecasting_engine.training import train_models_by_season, save_model, load_model_metrics
from forecasting_engine.prediction import generate_forecast
from forecasting_engine.plan_compras import build_plan_compras

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def train_workflow(excel_path: str) -> Dict:
    """
    Complete training workflow for both PV and OI seasons
    
    Args:
        excel_path: Path to historical Excel data
        
    Returns:
        Dict with training results for both seasons
    """
    logger.info("\n" + "="*80)
    logger.info("STARTING ML TRAINING WORKFLOW")
    logger.info("="*80 + "\n")
    
    results = {}
    
    # Train for PV season
    try:
        logger.info("Training model for PV (Primavera/Verano)...")
        X_pv, y_pv, _ = prepare_data_for_training(excel_path, 'PV')
        
        if len(X_pv) > 0:
            pv_result = train_models_by_season(X_pv, y_pv, 'PV')
            save_model(pv_result['best_model'], 'PV', pv_result['best_model_name'], pv_result['metrics'])
            results['PV'] = {
                'status': 'success',
                'model': pv_result['best_model_name'],
                'metrics': pv_result['metrics'],
                'samples': len(X_pv)
            }
            logger.info(f"✅ PV model trained successfully: {pv_result['best_model_name']}")
        else:
            results['PV'] = {'status': 'no_data'}
            logger.warning("⚠️ No data available for PV season")
    except Exception as e:
        logger.error(f"❌ PV training failed: {e}")
        results['PV'] = {'status': 'error', 'error': str(e)}
    
    # Train for OI season
    try:
        logger.info("\nTraining model for OI (Otoño/Invierno)...")
        X_oi, y_oi, _ = prepare_data_for_training(excel_path, 'OI')
        
        if len(X_oi) > 0:
            oi_result = train_models_by_season(X_oi, y_oi, 'OI')
            save_model(oi_result['best_model'], 'OI', oi_result['best_model_name'], oi_result['metrics'])
            results['OI'] = {
                'status': 'success',
                'model': oi_result['best_model_name'],
                'metrics': oi_result['metrics'],
                'samples': len(X_oi)
            }
            logger.info(f"✅ OI model trained successfully: {oi_result['best_model_name']}")
        else:
            results['OI'] = {'status': 'no_data'}
            logger.warning("⚠️ No data available for OI season")
    except Exception as e:
        logger.error(f"❌ OI training failed: {e}")
        results['OI'] = {'status': 'error', 'error': str(e)}
    
    logger.info("\n" + "="*80)
    logger.info("TRAINING WORKFLOW COMPLETE")
    logger.info("="*80 + "\n")
    
    return results


def predict_workflow(excel_path: str, target_season: str, num_tiendas: int = 10) -> Dict:
    """
    Complete prediction workflow: load data → predict → generate Plan de Compras
    
    Args:
        excel_path: Path to Excel data
        target_season: 'next_PV' or 'next_OI'
        num_tiendas: Number of stores for x tienda calculation
        
    Returns:
        Dict with complete forecast results including Plan de Compras
    """
    logger.info("\n" + "="*80)
    logger.info(f"STARTING ML PREDICTION WORKFLOW: {target_season}")
    logger.info("="*80 + "\n")
    
    try:
        # Load and preprocess data
        logger.info("Loading and preprocessing data...")
        df = load_excel(excel_path)
        df = parse_dates(df)
        df = extract_season(df)
        df = clean_data(df)
        
        # Generate forecast
        logger.info("Generating forecast...")
        forecast_result = generate_forecast(df, target_season)
        
        # Load model metrics for the season type
        season_type = forecast_result['season_type']
        model_metadata = load_model_metrics(season_type)
        
        # Build Plan de Compras
        logger.info("Building Plan de Compras...")
        plan_df = build_plan_compras(
            forecast_result['predictions_df'],
            num_tiendas=num_tiendas
        )
        
        # Convert plan to dict for JSON serialization
        plan_dict = plan_df.to_dict('records')
        
        # Combine results with frontend-expected field names
        result = {
            'status': 'success',
            # Frontend expected fields
            'temporada_objetivo': forecast_result['season_label'],
            'cobertura_productos': forecast_result['coverage'],
            'modelo_ganador': model_metadata.get('model_name', 'ML'),
            'mape': model_metadata.get('metrics', {}).get('mape'),
            'mae': model_metadata.get('metrics', {}).get('mae'),
            'rmse': model_metadata.get('metrics', {}).get('rmse'),
            'plan_compras': plan_dict,
            # Additional useful fields
            'season_type': forecast_result['season_type'],
            'season_year': forecast_result['season_year'],
            'total_skus': forecast_result['total_skus'],
            'total_predicted_units': forecast_result['total_predicted_units'],
            'summary': {
                'total_sections': len(plan_df),
                'total_uds': int(plan_df['UDS'].sum()),
                'total_pvp': float(plan_df['PVP'].sum()),
                'total_coste': float(plan_df['COSTE'].sum()),
                'avg_margin': float(plan_df['Mk'].mean())
            }
        }
        
        logger.info("\n" + "="*80)
        logger.info("PREDICTION WORKFLOW COMPLETE")
        logger.info(f"Season: {result['temporada_objetivo']}")
        logger.info(f"Model: {result['modelo_ganador']}")
        logger.info(f"Coverage: {result['cobertura_productos']:.1f}%")
        logger.info(f"MAPE: {result['mape']:.1f}%" if result['mape'] else "MAPE: N/A")
        logger.info(f"Total Units: {result['summary']['total_uds']:,}")
        logger.info(f"Total PVP: €{result['summary']['total_pvp']:,.2f}")
        logger.info(f"Sections: {result['summary']['total_sections']}")
        logger.info("="*80 + "\n")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Prediction workflow failed: {e}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e)
        }


if __name__ == '__main__':
    """
    CLI interface for training and prediction
    
    Usage:
        python -m forecasting_engine.main train <excel_path>
        python -m forecasting_engine.main predict <excel_path> <next_PV|next_OI> [num_tiendas]
    """
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Training:   python -m forecasting_engine.main train <excel_path>")
        print("  Prediction: python -m forecasting_engine.main predict <excel_path> <next_PV|next_OI> [num_tiendas]")
        sys.exit(1)
    
    command = sys.argv[1]
    excel_path = sys.argv[2]
    
    if command == 'train':
        results = train_workflow(excel_path)
        print(json.dumps(results, indent=2))
        
    elif command == 'predict':
        if len(sys.argv) < 4:
            print("Error: target_season required (next_PV or next_OI)")
            sys.exit(1)
        
        target_season = sys.argv[3]
        num_tiendas = int(sys.argv[4]) if len(sys.argv) > 4 else 10
        
        results = predict_workflow(excel_path, target_season, num_tiendas)
        print(json.dumps(results, indent=2))
        
    else:
        print(f"Unknown command: {command}")
        print("Use 'train' or 'predict'")
        sys.exit(1)
